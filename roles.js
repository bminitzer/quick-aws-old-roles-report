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

async function listRoles(Marker) {
  const params = {
    MaxItems: 5,
    Marker
  };

  return await IAM.listRoles(params).promise();
}

async function getRole(RoleName) {
  const params = {
    RoleName
  };

  return await IAM.getRole(params).promise();
}

async function getRolesNotUsedForLast90Days() {
  let allRoles;

  let page = await listRoles();

  allRoles = [...page.Roles];

  while (page.IsTruncated) {
    page = await listRoles(page.Marker);
    allRoles = [...allRoles, ...page.Roles];
  }

  const roleChunks = chunk(allRoles, 5);

  let rolesWithLastUsed = [];

  for (let i = 0; i < roleChunks.length; i++) {
    let page = await Promise.all(
      roleChunks[i].map(function({ RoleName }) {
        return getRole(RoleName);
      })
    );

    rolesWithLastUsed = [...rolesWithLastUsed, ...page];
  }

  return rolesWithLastUsed
    .map(({ Role }) => {
      return {
        name: Role.RoleName,
        created: moment().diff(Role.CreateDate, "days"),
        last_activity: Role.RoleLastUsed.LastUsedDate
          ? moment().diff(moment(Role.RoleLastUsed.LastUsedDate), "days")
          : "NONE"
      };
    })
    .filter(policy => {
      return policy.created >= 90;
    })
    .filter(role => {
      return role.last_activity >= 90 || role.last_activity === "NONE";
    });
}

getRolesNotUsedForLast90Days().then(rolesNotUsedForLast90Days => {
  console.table(rolesNotUsedForLast90Days);
  console.log(`Count: ${rolesNotUsedForLast90Days.length}`);

  const { Parser } = require("json2csv");

  const json2csvParser = new Parser();
  const csv = json2csvParser.parse(rolesNotUsedForLast90Days);

  fs.writeFileSync("old-roles.csv", csv);
});
