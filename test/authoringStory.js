/*
 * ------------
 * StoryPlaces
 * ------------
 * This application was developed as part of the Leverhulme Trust funded
 * StoryPlaces Project. For more information, please visit storyplaces.soton.ac.uk
 * Copyright (c) 2017 University of Southampton
 *
 * David Millard, dem.soton.ac.uk
 * Andy Day, a.r.day.soton.ac.uk
 * Kevin Puplett, k.e.puplett.soton.ac.uk
 * Charlie Hargood, chargood.bournemouth.ac.uk
 * David Pepper, d.pepper.soton.ac.uk
 *
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * - Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * - Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * - The name of the University of Southampton nor the name of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE ABOVE COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

//During the test the env variable is set to test
process.env.NODE_ENV = 'test';

var mongoose = require("mongoose");
var AuthoringSchema = require('../models/authoringSchema');

// Misc requires
var fs = require('fs');

//Require the dev-dependencies
var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../server');
var should = chai.should();

chai.use(chaiHttp);

// Setup - Empty the database before each test
describe('AuthoringStories', function () {
    beforeEach(function (done) {
        AuthoringSchema.AuthoringStory.remove({}, function (err) {
            done();
        });
    });


    /*
     * Test the /GET route
     */
    describe('/GET authoringStory', function () {
        it('it should GET all the authoringStories', function (done) {
            chai.request(server)
                .get('/storyplaces/authoring/story')
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.body.should.be.a('array');
                    res.body.length.should.be.eql(0);
                    done();
                });
        });
    });

    /*
     * Test the /POST route
     */
    describe('/POST empty story', function () {
        it('it should not POST an empty story', function (done) {
            var story = {}
            chai.request(server)
                .post('/storyplaces/authoring/story')
                .set("Content-Type", "application/json")
                .set("X-Auth-Token", "thisisadefaultpass")
                .send(story)
                .end(function (err, res) {
                    res.should.have.status(400);
                    res.body.should.be.a('object');
                    res.body.should.have.property('error');
                    res.body.error.should.equal('Unable To save authoring story');
                    done();
                });
        });

    });

    describe('/POST valid story', function () {
        xit('it should POST a valid story', function (done) {
            var story = JSON.parse(fs.readFileSync('test/resources/authoring_the_destitute_and_the_alien.json'));
            chai.request(server)
                .post('/storyplaces/authoring/story')
                .set("Content-Type", "application/json")
                .set("X-Auth-Token", "thisisadefaultpass")
                .send(story)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('message').eql('Authoring Story created!');
                    CoreSchema.Story.findOne({'_id': 'TODO: FILL THIS IN'}, function (err, res) {
                        res.should.not.be.null;
                        done();
                    });
                });
        });

    });

    describe('/POST story then /GET/:id story', function () {
        xit('it should retrieve a POSTed story', function (done) {
            var story = JSON.parse(fs.readFileSync('test/resources/the_destitute_and_the_alien.json'));
            chai.request(server)
                .post('/storyplaces/story')
                .set("Content-Type", "application/json")
                .set("X-Auth-Token", "thisisadefaultpass")
                .send(story)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('message').eql('Story created!');
                });
            chai.request(server)
                .get('/storyplaces/story/579b8de189ed4ed46600005f')
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.eql(story);
                    done();
                });
        });

    });
});