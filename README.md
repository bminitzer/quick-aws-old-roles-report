# Usage Guide
## INSTALL NODE & NPM Dependencies
First, install Node and make sure the installation ran successfully. After that, open a terminal and go to the project root and run:

    npm install
Once the installation has finished, consider this step to be finished.

## CONFIGURE AWS Credentials
For easy management of credentials, the script uses AWS Shared Credentials approach. For Linux, the shared credentials are located at `~/.aws/credentials`. Open this file in an editor and make sure there is a profile you can use. Keep the profile name in mind and find the following block of code in `index.js`:

    const credentials =  new  AWS.SharedIniFileCredentials({
      profile:  "role_finder"
    });
Replace profile with your profile name. Save `index.js` and consider this step to be finished.

## RUN
In the terminal, browse to the project root and run:

    node index.js

You'll see output as follows:

    ┌─────────┬───────────────────────────────────────────┬───────────────┐
    │ (index) │                   name                    │ last_activity │
    ├─────────┼───────────────────────────────────────────┼───────────────┤
    │    0    │    'appsync-graphqlapi-logs-us-east-1'    │    'NONE'     │
    │    1    │        'AWSServiceRoleForSupport'         │    'NONE'     │
    │    2    │     'AWSServiceRoleForTrustedAdvisor'     │    'NONE'     │
    │    3    │  'eyelytics-dev-23234234233423-authRole'  │      95       │
    │    4    │ 'eyelytics-dev-23234234223423-unauthRole' │    'NONE'     │
    └─────────┴───────────────────────────────────────────┴───────────────┘
    Count: 5
