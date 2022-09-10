"use strict";
const AWS = require('aws-sdk');

class FileLocationConverter {
  static getKey(config, file) {
    return `${config.directory ? `${config.directory}/` : ''}${file.hash}${file.ext}`
  }

  static getUrl(config, data) {
    if (config.cdn)
      return data.Location.replace(`https://${config.endpoint}/${config.space}`, config.cdn);
    else
      return data.Location
  }
}

module.exports = {
  init(config) {
      const spacesEndpoint = new AWS.Endpoint(config.endpoint);
    const S3 = new AWS.S3({
        endpoint: spacesEndpoint,
        accessKeyId: config.key,
        secretAccessKey: config.secret,
        params: {
            ACL: 'public-read',
            Bucket: config.space,
            CacheControl: 'public, max-age=31536000, immutable'
        },
    });

    const upload = (file, customParams = {}) =>
        new Promise((resolve, reject) => {
          // upload file on S3 bucket
          S3.upload(
              {
                Key: FileLocationConverter.getKey(config, file),
                Body: file.stream || Buffer.from(file.buffer, 'binary'),
                ContentType: file.mime,
                ...customParams,
              },
              (err, data) => {
                if (err) {
                  return reject(err);
                }

                // set the bucket file url
                file.url = FileLocationConverter.getUrl(config, data);

                resolve();
              }
          );
        });

    return {
      uploadStream(file, customParams = {}) {
        return upload(file, customParams);
      },
      upload(file, customParams = {}) {
        return upload(file, customParams);
      },
      delete(file, customParams = {}) {
        return new Promise((resolve, reject) => {
          // delete file on S3 bucket
          S3.deleteObject(
              {
                Key: FileLocationConverter.getKey(config, file),
                ...customParams,
              },
              (err, data) => {
                if (err) {
                  return reject(err);
                }

                resolve();
              }
          );
        });
      },
    };
  },
};
