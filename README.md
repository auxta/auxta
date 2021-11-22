# AuxTA

# Content
* [puppeteer](#puppeteer)
* [install](#install)
* [setup](#setup)
* [running](#running)

## Puppeteer

https://pptr.dev

https://github.com/puppeteer/puppeteer

## Install

npm i

## setup

```
{
  # All background functions that will be run, listed
  "suitesList": [
    "{filename}-background"
  ],
  # The tested site's url
  "baseURL": "https://{sitename}/",
  # The url where the tests are ran
  "testsURL": "https://{sitename}/",
  # The organization's name
  "organization": "string",
  # The digital product's name
  "digitalProduct": "bedrijfsfinanciering.com",
  # Max timeout in milliseconds
  # Default 1000
  "timeout": 1000,
  # The credentials of the user that uploads the tests to the site
  "email": "",
  "password": "",
  "token": ""
}

```

## running

* Create a main function that calls the run() function which starts all tests
* Create a function for each test that calls the `auxtaPuppeteer.run(event, callback, featureName, scenarioName)` function
