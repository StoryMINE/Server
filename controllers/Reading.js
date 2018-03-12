/* *****************************************************************************
 *
 * StoryPlaces
 *

 This application was developed as part of the Leverhulme Trust funded
 StoryPlaces Project. For more information, please visit storyplaces.soton.ac.uk

 Copyright (c) 2016
 University of Southampton
 Charlie Hargood, cah07r.ecs.soton.ac.uk
 Kevin Puplett, k.e.puplett.soton.ac.uk
 David Pepper, d.pepper.soton.ac.uk

 All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:
 * Redistributions of source code must retain the above copyright
 notice, this list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright
 notice, this list of conditions and the following disclaimer in the
 documentation and/or other materials provided with the distribution.
 * The name of the Universities of Southampton nor the name of its
 contributors may be used to endorse or promote products derived from
 this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 ARE DISCLAIMED. IN NO EVENT SHALL THE ABOVE COPYRIGHT HOLDERS BE LIABLE FOR ANY
 DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

 ***************************************************************************** */

"use strict";
var crypto = require('crypto');

var CoreSchema = require('../models/coreschema');
var helpers = require('./helpers.js');

exports.create = create;
exports.index = index;
exports.update = update;
exports.fetch = fetch;
exports.getStates = getStates;
exports.updateStates = updateStates;

function create(req, res, next) {

    let requestBody = helpers.sanitizeAndValidateInboundIds(undefined, req.body);

    var reading = new CoreSchema.StoryInstance(requestBody);

    reading.save(function (err) {
        if (err) {
            err.status = 400;
            err.clientMessage = "Unable To save reading";
            return next(err);
        }

        let toSend = helpers.sanitizeOutboundObject(reading);
        toSend.readers = toSend.readers.map(reader => helpers.sanitizeOutboundJson(reader));

        res.json(toSend);
    });
}

function index(req, res, next) {
    CoreSchema.StoryInstance.find(function (err, readings) {
        if (err) {
            return next(err);
        }

        let toSend = readings.map(reading => helpers.sanitizeOutboundObject(reading));

        res.json(toSend);
    });
}

function fetch(req, res, next) {
    try {
        var readingId = helpers.validateId(req.params.reading_id);
    } catch (error) {
        return next(error);
    }

    CoreSchema.StoryInstance.findById(readingId, function (err, reading) {
        if (err) {
            return next(err);
        }

        if (!reading) {
            var error = new Error();
            error.status = 404;
            error.clientMessage = error.message = "StoryInstance not found";
            return next(error);
        }

        let toSend = helpers.sanitizeOutboundObject(reading);
        toSend.readers = toSend.readers.map(reader => helpers.sanitizeOutboundJson(reader));

        res.json(toSend);
    });
}

function update(req, res, next) {
    try {
        var readingId = helpers.validateId(req.params.reading_id);
    } catch (error) {
        return next(error);
    }

    CoreSchema.StoryInstance.findByIdAndUpdate(readingId, {
        readers: req.body.readers,
        state: req.body.state,
        timestamp: req.body.timestamp
    }, {new: true, runValidators: true}, function (err, reading) {
        if (err) {
            return next(err);
        }

        if (!reading) {
            var error = new Error();
            error.status = 400;
            error.clientMessage = error.message = "Unable To update reading";
            return next(error);
        }

        let toSend = helpers.sanitizeOutboundObject(reading);
        toSend.readers = toSend.readers.map(reader => helpers.sanitizeOutboundJson(reader));

        res.json(toSend);
    });
}

function getStates(req, res, next) {
    try {
        var readingId = helpers.validateId(req.params.reading_id);
    } catch (error) {
        return next(error);
    }

    CoreSchema.StateScope.findOne({readingId: readingId}, function (err, stateScope) {
        if (err) {
            return next(err);
        }

        let defaultSharedScope = new CoreSchema.StateScope({readingId: readingId});

        let toSend = {
            shared: stateScope || defaultSharedScope,
            global: {storyId: "1234", states: [], revision: 0}
        };

        res.json(toSend);
    });
}

function hashVariable(namespace, key, value) {
    return [namespace, key, value].join("->");
}

function hashScope(scope) {
    let toHash = scope.states.reduce((result, state) => {
        return result.concat(state.variables.reduce((variableHashes, variable) => {
            variableHashes.push(hashVariable(state.id, variable.id, variable.value));
            return variableHashes;
        }, []));
    }, []).join(":");

    let hash = crypto.createHash("MD5");
    hash.update(toHash);

    return hash.digest('hex');
}

function isValidScope(scope) {
    if(typeof scope !== "object") { return false; }
    return Array.isArray(scope.states);
}

function updateStates(req, res, next) {
    console.log(req.body);

    if(typeof req.body !== "object" || !isValidScope(req.body.shared) || !isValidScope(req.body.global)) {
        let error = new Error();
        error.status = 400;
        error.clientMessage = error.message = "Invalid state passed";
        return next(error);
    }

    try {
        var readingId = helpers.validateId(req.body.shared.readingId);
    } catch (error) {
        return next(error);
    }

    //req.body.shared.revision = hashScope(req.body.shared);


    CoreSchema.StateScope.findOne({readingId: readingId})
      .then((serverSharedScope) => {
          console.log("Server revision: " + serverSharedScope.revision);
          console.log("Update revision: " + req.body.shared.revision);
          if(serverSharedScope.revision !== req.body.shared.revision) {
              console.log("WARNING: Collision");
              return res.json({
                  collision: true,
                  scopes: {
                      shared: serverSharedScope,
                      global: {storyId: "1234", states: [], revision: 0}
                  }
              });
          } else {
              //If it's a valid update, we need to update the revision before saving/
              req.body.shared.revision = hashScope(req.body.shared);
          }

          return CoreSchema.StateScope.findOneAndUpdate({
              readingId: readingId
          }, req.body.shared, {upsert: true, new: true, runValidators: true}
          ).then((updatedStateScope) => {
              let defaultSharedScope = new CoreSchema.StateScope({readingId: readingId});

              let toSend = {
                  collision: false,
                  scopes: {
                      shared: updatedStateScope || defaultSharedScope,
                      global: {storyId: "1234", states: [], revision: 0}
                  },
              };

              res.json(toSend);
          });
    });
}