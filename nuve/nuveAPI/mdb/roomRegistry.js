/* global require, exports, ObjectId */


const db = require('./dataBase').db;

const logger = require('./../logger').logger;

// Logger
const log = logger.getLogger('RoomRegistry');

exports.getRooms = (callback) => {
  db.rooms.find({}).toArray((err, rooms) => {
    if (err || !rooms) {
      log.info('message: rooms list empty');
    } else {
      callback(rooms);
    }
  });
};

const getRoom = (id, callback) => {
  db.rooms.findOne({ _id: db.ObjectId(id) }, (err, room) => {
    if (room === undefined) {
      log.warn(`message: getRoom - Room not found, roomId: ${id}`);
    }
    if (callback !== undefined) {
      callback(room);
    }
  });
};

exports.getRoom = getRoom;

const hasRoom = (id, callback) => {
  getRoom(id, (room) => {
    if (room === undefined) {
      callback(false);
    } else {
      callback(true);
    }
  });
};

exports.hasRoom = hasRoom;
/*
 * Adds a new room to the data base.
 */
exports.addRoom = (room, callback) => {
  db.rooms.save(room, (error, saved) => {
    if (error) log.warn(`message: addRoom error, ${logger.objectToLog(error)}`);
    callback(saved);
  });
};

/* eslint-disable */
exports.assignErizoControllerToRoom = function(room, erizoControllerId, callback) {
  db.rooms.findOne({_id: db.ObjectId(room._id)}, function(err, findRoom){
    if (err) log.warn('message: assignErizoControllerToRoom error, ' + logger.objectToLog(err));
    if (!findRoom) {
       callback(undefined);
    }
    if (findRoom.erizoControllerId) {
      db.erizoControllers.findOne({_id: findRoom.erizoControllerId}, function(err, assignedErizoController){
        if (err) log.warn('message: assignErizoControllerToRoom error, ' + logger.objectToLog(err));
        if (assignedErizoController) {
          callback(assignedErizoController);
        }
      });
    }
    else{
      db.erizoControllers.findOne({_id: db.ObjectId(erizoControllerId)}, function(err, notAssignedErizoController){
        if (err) log.warn('message: assignErizoControllerToRoom error, ' + logger.objectToLog(err));
        if (notAssignedErizoController) {
          room.erizoControllerId = db.ObjectId(erizoControllerId);
          db.rooms.save( room, function(err, savedRoom){
            if (err) log.warn('message: assignErizoControllerToRoom error, ' + logger.objectToLog(err));
          });
          callback(notAssignedErizoController);
        }
      });
    }
  });
};

/* eslint-enable */

/*
 * Updates a determined room
 */
exports.updateRoom = (id, room, callback) => {
  db.rooms.update({ _id: db.ObjectId(id) }, room, (error) => {
    if (error) log.warn(`message: updateRoom error, ${logger.objectToLog(error)}`);
    if (callback) callback(error);
  });
};

/*
 * Removes a determined room from the data base.
 */
exports.removeRoom = (id) => {
  hasRoom(id, (hasR) => {
    if (hasR) {
      db.rooms.remove({ _id: db.ObjectId(id) }, (error) => {
        if (error) {
          log.warn(`message: removeRoom error, ${logger.objectToLog(error)}`);
        }
      });
    }
  });
};
