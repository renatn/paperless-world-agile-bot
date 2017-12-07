const { logger } = require('./logger.js');

const firebase = require('firebase');


const getActiveEventId = () => firebase.database().ref('activeEvent').once('value').then((snapshot) => {
  if (snapshot.exists()) {
    const activeEvent = snapshot.val();
    return activeEvent.id;
  }
  return null;
});

const getEventById = eventId => firebase.database().ref(`events/${eventId}`).once('value').then(snapshot => snapshot.val());

const storeUser = (user) => {
  logger.info('Saving user to firebase');
  firebase.database().ref(`users/${user.id}`).set({
    ...user,
  });
};

const isUserAlreadyVoted = (eventId, userId) => firebase.database().ref(`events/${eventId}/vote/${userId}`).once('value').then(snapshot => snapshot.exists());

const storeVote = (eventId, user, choice) => {
  logger.info(`User ${user.id} vote ${choice}`);

  return firebase.database().ref(`events/${eventId}/vote/${user.id}`).set({
    username: user.first_name,
    choice,
  });
};

const storeComment = (eventId, userId, comment) => {
  logger.info(`User ${userId} commented: ${comment}`);

  return firebase.database().ref(`events/${eventId}/vote/${userId}`).update({
    comment,
  });
};

const storeEvent = (eventName) => {
  logger.info(`New event: ${eventName}`);
  const newEventRef = firebase.database().ref('events').push();
  return newEventRef.set({
    name: eventName,
    active: true,
  }).then(() => firebase.database().ref('activeEvent').set({ id: newEventRef.key })).then(() => newEventRef.key);
};

const getUsers = () => firebase.database().ref('users').once('value').then((snapshot) => {
  const users = [];
  snapshot.forEach((x) => {
    users.push(x.val());
  });
  return users;
});


const connect = (cb) => {
  firebase.initializeApp({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DB_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  });


  firebase.database().ref('.info/connected').on('value', (snapshot) => {
    if (snapshot.val() === true) {
      logger.info('Firebase: connected');
      cb(true);
    } else {
      logger.info('Firebase: not connected');
      cb(false);
    }
  });
};

const isUnknownUser = userId => firebase.database().ref(`users/${userId}`).once('value').then(snapshot => !snapshot.exists());


const getEventVotes = eventId => firebase.database().ref(`events/${eventId}/vote`).once('value').then((snapshot) => {
  const votes = [];
  snapshot.forEach((x) => {
    votes.push(x.val());
  });
  return votes;
});

module.exports = {
  storeVote,
  storeUser,
  storeComment,
  storeEvent,
  getActiveEventId,
  getEventById,
  getUsers,
  getEventVotes,
  isUserAlreadyVoted,
  isUnknownUser,
  connect,
};

