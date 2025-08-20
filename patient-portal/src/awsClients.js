import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand
} from "@aws-sdk/client-s3";
import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  ScanCommand
} from "@aws-sdk/client-dynamodb";
import { awsConfig } from "./awsConfig";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// --- clients
export const s3 = new S3Client({
  region: awsConfig.region,
  credentials: {
    accessKeyId: awsConfig.accessKeyId,
    secretAccessKey: awsConfig.secretAccessKey
  }
});

export const ddb = new DynamoDBClient({
  region: awsConfig.region,
  credentials: {
    accessKeyId: awsConfig.accessKeyId,
    secretAccessKey: awsConfig.secretAccessKey
  }
});

// --- helpers
const safeFolder = (s) => s.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
const userPrefix = (username) => `users/${safeFolder(username)}/`;

// --- PATIENT APIs ---
export async function registerUser({ username, password, email, name }) {
  await ddb.send(new PutItemCommand({
    TableName: "Patients",
    Item: {
      username: { S: username },
      password: { S: password },
      email:    { S: email ?? "" },
      name:     { S: name ?? "" }
    },
    ConditionExpression: "attribute_not_exists(username)"
  }));
}

export async function loginUser({ username, password }) {
  const res = await ddb.send(new GetItemCommand({
    TableName: "Patients",
    Key: { username: { S: username } }
  }));
  if (!res.Item) throw new Error("User not found");
  if ((res.Item.password?.S ?? "") !== password) {
    throw new Error("Wrong password");
  }
  return {
    username,
    email: res.Item.email?.S ?? "",
    name: res.Item.name?.S ?? ""
  };
}

export async function uploadUserFile({ username, file }) {
  const key = userPrefix(username) + `${Date.now()}_${file.name}`;
  await s3.send(new PutObjectCommand({
    Bucket: awsConfig.bucketName,
    Key: key,
    Body: file
  }));
  return key;
}

export async function listUserFiles({ username }) {
  const res = await s3.send(new ListObjectsV2Command({
    Bucket: awsConfig.bucketName,
    Prefix: userPrefix(username)
  }));
  return (res.Contents || []).map(o => o.Key);
}

export async function getFileLink({ key }) {
  const command = new GetObjectCommand({
    Bucket: awsConfig.bucketName,
    Key: key
  });
  return await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
}

// --- DOCTOR APIs ---
export async function loginDoctor({ doctorname, doctorpassword, doctorid }) {
  // For demo, hardcoded doctor login
  if (doctorname === "admin" && doctorpassword === "12345" && doctorid === "D001") {
    return { doctorname };
  }
  throw new Error("Invalid doctor credentials");
}

export async function getAllPatients() {
  const res = await ddb.send(new ScanCommand({
    TableName: "Patients"
  }));
  return (res.Items || []).map(item => ({
    username: item.username.S,
    name: item.name?.S || "",
    email: item.email?.S || ""
  }));
}
