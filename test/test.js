'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const should = chai.should();

const { BlogPost } = require('../models');
const { runServer, app, closeServer } = require('../server');
const { TEST_DATABASE_URL } = ('../config');

chai.use(chaiHttp);

function seedBlogData() {
  console.info('seeding blog data');
  const seedData = [];
  
  for (let i=1; i<=10; i++) {
    seedData.push(generateBlogData());
  }
  // this will return a promise
  return BlogPost.insertMany(seedData);
}

function generateBlogData() {
  return {
    title: faker.lorem.words(),
    content: faker.lorem.paragraph(),
    author: {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName()
    }
    //created: 
  };
}

function tearDownDb() {
  console.warn('Deleting database');
  return mongoose.connection.dropDatabase();
}

describe('Blogpost API resource', function() {

  before(function() {
    return runServer(TEST_DATABASE_URL);
  });
    
  beforeEach(function() {
    return seedBlogData();
  });
    
  afterEach(function() {
    return tearDownDb();
  });
    
  after(function() {
    return closeServer();
  });

  describe('GET endpoint', function() {
    
    it('should return all existing blogposts', function() {
      
      let res;
      return chai.request(app)
        .get('/posts')
        .then(function(_res) {
          // so subsequent .then blocks can access resp obj.
          res = _res;
          res.should.have.status(200);
          // otherwise our db seeding didn't work
          //console.log(res.body);
          res.body.should.have.length.of.at.least(1);
          return BlogPost.count();
        })
        .then(function(count) {
          res.body.should.have.lengthOf(count);
        });
    });
    
    
    it('should return blogposts with right fields', function() {
      // Strategy: Get back all posts, and ensure they have expected keys
    
      let resBlogpost;
      return chai.request(app)
        .get('/posts')
        .then(function(res) {
          res.should.have.status(200);
          res.should.be.json;
          res.body.should.be.a('array');
          res.body.should.have.length.of.at.least(1);
    
          res.body.forEach(function(blogpost) {
            blogpost.should.be.a('object');
            blogpost.should.include.keys(
              'id', 'author', 'title', 'content', 'created');
          });
          resBlogpost = res.body[0];
          return BlogPost.findById(resBlogpost.id);
        })
        .then(function(blogpost) {
          let resBlogpostDate = new Date(resBlogpost.created);

          resBlogpost.id.should.equal(blogpost.id);
          resBlogpost.author.should.equal(`${blogpost.author.firstName} ${blogpost.author.lastName}`);
          resBlogpost.title.should.equal(blogpost.title);
          resBlogpost.content.should.equal(blogpost.content);
          resBlogpostDate.toUTCString().should.equal(blogpost.created.toUTCString());
        });
    });
  });


  describe('POST endpoint', function() {
    // strategy: make a POST request with data,
    // then prove that the blogpost we get back has
    // right keys, and that `id` is there (which means
    // the data was inserted into db)
    it('should add a new post', function() {

      const newPost = generateBlogData();

      return chai.request(app)
        .post('/posts')
        .send(newPost)
        .then(function(res) {
          res.should.have.status(201);
          res.should.be.json;
          res.body.should.be.a('object');
          res.body.should.include.keys(
            'id', 'author', 'title', 'content', 'created');
          res.body.title.should.equal(newPost.title);
          // cause Mongo should have created id on insertion
          res.body.id.should.not.be.null;
          res.body.content.should.equal(newPost.content);
          res.body.author.should.equal(`${newPost.author.firstName} ${newPost.author.lastName}`);

          return BlogPost.findById(res.body.id);
        })
        .then(function(blogpost) {  
          blogpost.title.should.equal(newPost.title);
          blogpost.content.should.equal(newPost.content);
          //blogpost.created.should.equal(newPost.created);
          blogpost.author.firstName.should.equal(newPost.author.firstName);
          blogpost.author.lastName.should.equal(newPost.author.lastName);
        });
    });
  });


  describe('PUT endpoint', function() {
    
    // strategy:
    //  1. Get an existing restaurant from db
    //  2. Make a PUT request to update that restaurant
    //  3. Prove restaurant returned by request contains data we sent
    //  4. Prove restaurant in db is correctly updated
    it('should update fields you send over', function() {
      const updateData = {
        title: 'fofofofofofofof',
        content: 'futuristic fusion'
      };
    
      return BlogPost
        .findOne()
        .then(function(blogpost) {
          updateData.id = blogpost.id;
    
          // make request then inspect it to make sure it reflects
          // data we sent
          return chai.request(app)
            .put(`/posts/${blogpost.id}`)
            .send(updateData);
        })
        .then(function(res) {
          res.should.have.status(204);
    
          return BlogPost.findById(updateData.id);
        })
        .then(function(blogpost) {
          blogpost.title.should.equal(updateData.title);
          blogpost.content.should.equal(updateData.content);
        });
    });
  });

  describe('DELETE endpoint', function() {

    it('delete a post by id', function() {

      let blogpost;

      return BlogPost
        .findOne()
        .then(function(_blogpost) {
          blogpost = _blogpost;
          return chai.request(app).delete(`/posts/${blogpost.id}`);
        })
        .then(function(res) {
          res.should.have.status(204);
          return BlogPost.findById(blogpost.id);
        })
        .then(function(_blogpost) {
          // when a variable's value is null, chaining `should`
          // doesn't work. so `_blogpost.should.be.null` would raise
          // an error. `should.be.null(_blogpost)` is how we can
          // make assertions about a null value.
          should.not.exist(_blogpost);
        });
    });
  });






});



