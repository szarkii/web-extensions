const MESSAGE_TYPE = Object.freeze({
  "ADD_NOTIFICATION": 1,
  "REMOVE_NOTIFICATION": 2,
  "GET_NOTIFICATION_QUERY": 3,
  "SET_WHITE_WARNING_ICON": 4
});

const RED_WARNING_IMAGE = {"path": {"32": "icons/warning-red-32.png"}};
const WHITE_WARNING_IMAGE = {"path": {"32": "icons/warning-white-32.png"}};

var notificationQuery = [];

function serveMessage(message, sender, sendResponse) {
  switch(message.type) {
    case MESSAGE_TYPE.ADD_NOTIFICATION:
      addNotification(message.content);
      break;
    case MESSAGE_TYPE.REMOVE_NOTIFICATION:
      removeNotificationFromQuery(message.content.id);
      break;
    case MESSAGE_TYPE.GET_NOTIFICATION_QUERY:
      sendResponse(notificationQuery);
      break;
    case MESSAGE_TYPE.SET_WHITE_WARNING_ICON:
      setIconToWhite();
      break;
  }
}

function addNotification(notification) {
  notification.createdTime = new Date().getTime();
  var notificationId = addNotificationToQuery(notification);

  setTimeout(function() {
    createNotificationPopup(notification);
    setIconToRed();
  }, notification.delay * 1000 * 60);
}

function addNotificationToQuery(notification) {
  return notificationQuery.push(notification);
}

function createNotificationPopup(notification) {
  browser.notifications.create("", {
      "type": "basic",
      "title": "Nowe powiadomienie!",
      "message": notification.message
    });
}

function removeNotificationFromQuery(notificationIndex) {
  notificationQuery.splice(notificationIndex, 1);
}

function setIconToRed() {
  browser.browserAction.setIcon(RED_WARNING_IMAGE);
}

function setIconToWhite() {
  browser.browserAction.setIcon(WHITE_WARNING_IMAGE);
}

browser.runtime.onMessage.addListener(serveMessage);