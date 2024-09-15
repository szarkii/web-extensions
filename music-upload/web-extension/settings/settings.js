function saveSettings() {
    browser.storage.sync.set({
        "HOST": document.querySelector("#host").value,
        "TOKEN": document.querySelector("#token").value
    });
}

document.addEventListener("DOMContentLoaded", () => {
    function setSetting(selector, value) {
        document.querySelector(selector).value = value;
    }

    browser.storage.sync.get("HOST").then((storage) => 
        setSetting("#host", storage["HOST"] || ""
    ));
    
    browser.storage.sync.get("TOKEN").then((storage) =>
        setSetting("#token", storage["TOKEN"] || ""
    ));
});

document.querySelector("#save-button").addEventListener("click", saveSettings);
