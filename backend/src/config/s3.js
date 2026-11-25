const { S3Client } = require('@aws-sdk/client-s3');
module.exports = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });