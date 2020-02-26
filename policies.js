const AWS = require("aws-sdk");
const moment = require("moment");
const fs = require("fs");

const credentials = new AWS.SharedIniFileCredentials({
  profile: "role_finder"
});
AWS.config.credentials = credentials;

const IAM = new AWS.IAM({
  apiVersion: "2010-05-08"
});

function chunk(arr, len) {
  var chunks = [],
    i = 0,
    n = arr.length;

  while (i < n) {
    chunks.push(arr.slice(i, (i += len)));
  }

  return chunks;
}

async function listPolicies(Marker) {
  const params = {
    MaxItems: 100,
    Scope: "Local",
    Marker
  };

  return await IAM.listPolicies(params).promise();
}

async function generatePolicyData(Policy) {
  const genParams = {
    Arn: Policy.Arn
  };

  const { JobId } = await IAM.generateServiceLastAccessedDetails(
    genParams
  ).promise();

  const getParams = {
    JobId
  };

  const { ServicesLastAccessed } = await IAM.getServiceLastAccessedDetails(
    getParams
  ).promise();

  return {
    ...Policy,
    LastUsedDate: ServicesLastAccessed.reduce((lastUsed, service) => {
      if (service.LastAuthenticated) {
        const lastAuthenticated = moment(service.LastAuthenticated);

        if (!lastUsed) {
          return lastAuthenticated;
        } else if (lastAuthenticated.isAfter(lastUsed)) {
          return lastAuthenticated;
        }
      }

      return lastUsed;
    }, undefined)
  };
}

function fakeWait(time) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, time);
  });
}

async function getPoliciesNotUsedForLast90Days() {
  let allPolicies;

  let page = await listPolicies();

  allPolicies = [...page.Policies];

  while (page.IsTruncated) {
    await fakeWait(1000);
    page = await listPolicies(page.Marker);
    allPolicies = [...allPolicies, ...page.Policies];
  }

  const policyChunks = chunk(allPolicies, 5);

  let policiesWithLastUsed = [];

  for (let i = 0; i < policyChunks.length; i++) {
    let page = await Promise.all(policyChunks[i].map(generatePolicyData));

    policiesWithLastUsed = [...policiesWithLastUsed, ...page];
    await fakeWait(2500);
  }

  return policiesWithLastUsed
    .map(Policy => {
      return {
        name: Policy.PolicyName,
        created: moment().diff(Policy.CreateDate, "days"),
        last_activity: Policy.LastUsedDate
          ? moment().diff(moment(Policy.LastUsedDate), "days")
          : "NONE"
      };
    })
    .filter(policy => {
      return policy.created >= 90;
    })
    .filter(policy => {
      return policy.last_activity >= 90 || policy.last_activity === "NONE";
    });
}

getPoliciesNotUsedForLast90Days().then(policiesNotUsedForLast90Days => {
  console.table(policiesNotUsedForLast90Days);
  console.log(`Count: ${policiesNotUsedForLast90Days.length}`);

  const { Parser } = require("json2csv");

  const json2csvParser = new Parser();
  const csv = json2csvParser.parse(policiesNotUsedForLast90Days);

  fs.writeFileSync("old-policies.csv", csv);
});
