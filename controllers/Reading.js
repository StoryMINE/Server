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

var CoreSchema = require('../models/coreschema');
var helpers = require('./helpers.js');

exports.create = create;
exports.index = index;
exports.update = update;
exports.fetch = fetch;

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
        toSend.sharedStates = toSend.sharedStates.map(state => helpers.sanitizeOutboundJson(state));

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
        toSend.sharedStates = toSend.sharedStates.map(state => helpers.sanitizeOutboundJson(state));

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
        sharedStates: req.body.sharedStates,
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
        toSend.sharedStates = toSend.sharedStates.map(state => helpers.sanitizeOutboundJson(state));

        res.json(toSend);
    });
}