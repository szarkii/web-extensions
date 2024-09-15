const StorageKey = {
    Host: "HOST",
    Token: "TOKEN",
    Artist: "ARTIST",
    Album: "ALBUM"
};

class StorageService {

    async set(key, value) {
        const storage = await this.getAll();
        storage[key] = value;
        browser.storage.local.set(storage)
    }

    async get(key) {
        return (await this.getAll())[key];
    }

    getAll() {
        return browser.storage.local.get();
    }
}

class PopupComponent {
    constructor() {
    }

    getName() {
        return this.getNameHtmlElement().value;
    }

    setName(name) {
        this.getNameHtmlElement().value = name;
    }

    getNameHtmlElement() {
        return document.querySelector("#name");
    }

    getArtist() {
        return this.getArtistHtmlElement().value;
    }

    setArtist(artist) {
        this.getArtistHtmlElement().value = artist;
    }

    getArtistHtmlElement() {
        return document.querySelector("#artist");
    }

    getAlbum() {
        return this.getAlbumHtmlElement().value;
    }

    setAlbum(album) {
        this.getAlbumHtmlElement().value = album;
    }

    getAlbumHtmlElement() {
        return document.querySelector("#album");
    }

    getUploadButton() {
        return document.querySelector("#upload-button");
    }

    async renderTasks(tasks) {
        const container = document.querySelector(".queue");
        const templateHtml = container.getAttribute("template");

        container.innerHTML = "";
        tasks.forEach(task => {
            container.innerHTML += this.fillValuesInTemplate(templateHtml, task);
        });
    }

    fillValuesInTemplate(templateHtml, values) {
        let html = templateHtml;

        templateHtml.match(/(\${[\S\s]*?)}/gmi).forEach(variable => {
            const variablePath = variable.replace(/\${|}/g, "");
            html = html.replace(variable, this.extractDeepValue(values, variablePath));
        });

        return html;
    }

    extractDeepValue(object, path) {
        for (var i = 0, path = path.split('.'), len = path.length; i < len; i++) {
            object = object[path[i]];
        };

        return object;
    };

    showErrorMessage(message) {
        document.querySelector(".error").innerText = message;
    }

    showInfo(message) {
        document.querySelector(".info").innerText = message;
    }
}

class TabsService {
    async getCurrentTabUrl() {
        return (await this.getCurrentTab()).url;
    }

    async getCurrentTabName() {
        return (await this.getCurrentTab()).title;
    }

    async getCurrentTab() {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        return tabs[0];
    }
}

class UploadService {
    constructor(host, authorizationToken) {
        this.host = host;
        this.authorizationToken = authorizationToken;
    }

    async getTasks() {
        const options = {
            method: "GET",
            headers: this.getHeaders()
        }

        const response = await fetch(this.host + "/upload/status", options);
        return await response.json();
    }

    async upload(payload) {
        const options = {
            method: "POST",
            body: JSON.stringify(payload),
            headers: this.getHeaders()
        }

        return fetch(this.host + "/upload", options);
    }

    getHeaders() {
        return {
            "Content-Type": "application/json",
            "Authorization": this.authorizationToken
        };
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const popupComponent = new PopupComponent();

    const host = (await browser.storage.sync.get(StorageKey.Host))[StorageKey.Host];
    const token = (await browser.storage.sync.get(StorageKey.Token))[StorageKey.Token];

    if (!host || !token) {
        popupComponent.showErrorMessage("Host and token must be set before using the extension.");
        browser.runtime.openOptionsPage();
        return;
    }

    const storageService = new StorageService();
    const tabsService = new TabsService();
    const uploadService = new UploadService(host, token);

    const currentTabName = await tabsService.getCurrentTabName();
    // Trim website title
    popupComponent.setName(currentTabName.substring(currentTabName.length - 10, 0));
    popupComponent.showInfo(host);
    popupComponent.setArtist(await storageService.get(StorageKey.Artist) || "");
    popupComponent.setAlbum(await storageService.get(StorageKey.Album) || "");

    await popupComponent.renderTasks(await uploadService.getTasks());

    popupComponent.getUploadButton().addEventListener("click", async () => {
        const url = await tabsService.getCurrentTabUrl();
        const name = popupComponent.getName();
        const artist = popupComponent.getArtist();
        await storageService.set(StorageKey.Artist, artist);
        const album = popupComponent.getAlbum();
        await storageService.set(StorageKey.Album, album);

        const payload = {
            url,
            name,
            artist,
            album
        };

        await uploadService.upload(payload);
        popupComponent.renderTasks(await uploadService.getTasks()).then();
    });
});
