const http = require("http");
const { exec } = require("child_process");
const Fs = require('fs');
const Path = require('path');

const configFilePath = Path.resolve(__dirname, "config.json");

if (!Fs.existsSync(configFilePath)) {
  const defaultConfiguration = {
    hostname: "0.0.0.0",
    port: 8000,
    authorizationToken: "",
    musicDirectory: "",
    debugMode: true,
    expirationFinishedTasksMinutes: 60
  };

  console.error(`Configuration file does not exist. Go to "${configFilePath}" and update the file.`);
  Fs.writeFileSync(configFilePath, JSON.stringify(defaultConfiguration, null, 2), 'utf8');
  process.exit(1);
}

const Config = require(configFilePath);

const Logger = {
  debug: (message) => {
    if (Config.debugMode) {
      console.debug(`[${Logger.getTime()}] DEBUG ${message}`);
    }
  },

  error: (message) => {
    console.error(`[${Logger.getTime()}] ERROR ${message}`);
  },

  getTime: () => {
    const date = new Date();
    return `${date.toLocaleString("sv-SE")}:${date.getMilliseconds()}`;
  }
};

const UploadStatus = {
  Uploading: "UPLOADING",
  Finished: "FINISHED"
};

class UploadService {
  constructor() {
    this.tasks = [];
  }

  getUploadingTasks() {
    return this.tasks;
  }

  queueFile(file) {
    const task = {
      file,
      status: UploadStatus.Uploading,
      timestamp: new Date()
    };

    this.tasks.push(task);

    if (this.getOngoingTasks().length === 1) {
      this.downloadFile(task);
    }
  }

  downloadFile(task) {
    Logger.debug(`Starting download ${task.file.name}.`);

    let nameArgument = "";
    if (task.file.name) {
      nameArgument = `-n "${task.file.name}"`;
    }

    let artistArgument = "";
    if (task.file.artist) {
      artistArgument = `-a "${task.file.artist}"`;
    }

    let albumArgument = "";
    if (task.file.album) {
      albumArgument = `-l "${task.file.album}"`;
    }

    const command = `cd "${Config.musicDirectory}"; ` +
      `szarkii-music-metadata ${nameArgument} ${artistArgument} ${albumArgument} ${task.file.url}`;
    Logger.debug(`Executing command "${command}"`);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        Logger.error(error);
      } else {
        this.finishLastTask();
        this.executeNextTaskIfAny();

        if (stdout) {
          Logger.debug(stdout);
        }

        if (stderr) {
          Logger.error(stderr);
        }
      }
    });
  }

  finishLastTask() {
    const task = this.getOngoingTasks()[0];
    Logger.debug("Finished file from " + task.file.name);
    task.status = UploadStatus.Finished;
    task.timestamp = new Date();
  }

  executeNextTaskIfAny() {
    const ongoingTasks = this.getOngoingTasks();
    if (ongoingTasks.length) {
      this.downloadFile(ongoingTasks[0]);
    }
  }

  getOngoingTasks() {
    return this.tasks.filter(task => task.status === UploadStatus.Uploading);
  }

  deleteExpiredTasks() {
    const finishedTasks = this.tasks.filter(task => task.status === UploadStatus.Finished);
    if (!finishedTasks.length) {
      return;
    }

    const expirationTime = new Date((new Date()).getTime() - (60 * Config.expirationFinishedTasksMinutes * 1000));

    const tasksToDelete = this.tasks
      .filter(task => task.status === UploadStatus.Finished
        && task.timestamp.getTime() < expirationTime)
      .length;

    this.tasks.splice(0, tasksToDelete);
  }
}

const uploadService = new UploadService();

http.createServer(async function (request, response) {
  Logger.debug(request.url);

  if (request.headers.authorization !== Config.authorizationToken) {
    response.writeHead(401);
    response.end();
    return;
  }

  if (request.method === "GET" && request.url === "/upload/status") {
    uploadService.deleteExpiredTasks();

    response.writeHead(200);
    response.write(JSON.stringify(uploadService.getUploadingTasks()));
    response.end();
  }

  if (request.method === "POST" && request.url === "/upload") {
    let body = "";

    request.on("data", chunk => {
      body += chunk.toString();
    });

    request.on('end', async () => {
      Logger.debug(body);
      body = JSON.parse(body);

      if (!body.url) {
        response.writeHead(422);
        response.write("URL is empty.");
        response.end();
        return;
      }

      uploadService.queueFile(body);

      response.writeHead(200);
      response.write("OK");
      response.end();
    });

    return;
  }

  /** 404 */
  response.writeHead(404);
  response.end();

}).listen(Config.port, Config.hostname, () => {
  Logger.debug(`Server running at http://${Config.hostname}:${Config.port}/`)
});