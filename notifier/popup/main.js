const MESSAGE_TYPE = Object.freeze({
  "ADD_NOTIFICATION": 1,
  "REMOVE_NOTIFICATION": 2,
  "GET_NOTIFICATION_QUERY": 3,
  "SET_WHITE_WARNING_ICON": 4
});

const messageInput = document.getElementById("message");
const delayInput = document.getElementById("delay");
const notificationsQueryList = document.getElementById("notifications-query");
const LOG = document.getElementById("debug");

function reloadNotificationQuery() {
	browser.runtime.sendMessage({"type": MESSAGE_TYPE.GET_NOTIFICATION_QUERY}).then((notificationQuery) => {
		setNotificationQuery(notificationQuery);
	});
}

function setNotificationQuery(notificationQuery) {
	notificationsQueryList.innerHTML = "";

	notificationQuery.forEach((notification, index) => {
		addNotificationListElement(notification, index);
	});
}

function addNotificationListElement(notification, id) {
	const notificationListElement = document.createElement("li");
	const content = notification.message + " <br/>(" + createTimeLeftText(notification.createdTime, notification.delay) + ")";

	notificationListElement.setAttribute("notification-list-element-id", id);
	notificationListElement.class = "notification-list-element";
	notificationListElement.innerHTML = content;
	notificationsQueryList.appendChild(notificationListElement);

	notificationListElement.addEventListener("click", removeNotificationListElement);
}

function createTimeLeftText(createdTime, delay) {
	const now = (new Date()).getTime();
	const executionTime = createdTime + (delay * 60000);

	if (executionTime - now > 0) {
		const timeLeftInMinutes = Math.round(((executionTime - now) / 60000));
		return "za " + formatMinutesToHoursIfNeeded(timeLeftInMinutes) + " " + formatDateToTime(new Date(executionTime));
	}
	else {
		const timePassedInMinutes = Math.round(((now - executionTime) / 60000));
		return "<b>" + formatMinutesToHoursIfNeeded(timePassedInMinutes) + " temu</b> " + formatDateToTime(new Date(executionTime));
	}
}

function formatMinutesToHoursIfNeeded(minutes) {
	const hours = Math.floor(minutes/60);
	let formattedTime = minutes - (hours * 60) + " min.";
	
	return (hours > 0) ? hours + " godz. " + formattedTime : formattedTime;
}

function formatDateToTime(date) {
	return formatToDozen(date.getHours()) + ":" + formatToDozen(date.getMinutes()) + ":" + formatToDozen(date.getSeconds());
}

function formatToDozen(number) {
	return number / 10 >= 1 ? number.toString() : "0" + number;
}

function removeNotificationListElement(e) {
	let id = e.target.getAttribute("notification-list-element-id");
	sendRemoveNotificationRequest(id);
	reloadNotificationQuery();
}

function sendRemoveNotificationRequest(id) {
	browser.runtime.sendMessage({"type": MESSAGE_TYPE.REMOVE_NOTIFICATION, "content": {"id": id}});
}

function sendAddNotificationRequest() {
  const message = messageInput.value;
  const delay = parseFloat(delayInput.value);

  browser.runtime.sendMessage({"type": MESSAGE_TYPE.ADD_NOTIFICATION, "content": {"message": message, "delay": delay}}).then(reloadNotificationQuery);
}

function sendSetWhiteWarningIconRequest() {
  browser.runtime.sendMessage({"type": MESSAGE_TYPE.SET_WHITE_WARNING_ICON});
}


document.getElementById("submit").addEventListener("click", sendAddNotificationRequest);

console.info("Started Notification extension.");
// LOG.innerText = "[DEBUG tool]";

sendSetWhiteWarningIconRequest();
reloadNotificationQuery();