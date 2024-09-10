# AuxTA

## Guidelines for the Frontend Programmers

Every HTML element on a web page can be a selector, which can be used to create AuxTA scenarios.

Of course, not all HTML elemets are used as selectors to create AuxTA scenarios.

Those HTML elements, which will be used as selectors for AuxTA scenarios, should have a Unique ID. This way AuxTA scenarios are created the fastest.

The best candidate for this is the HTML "id" attribute.

The ID value should reflect the functionality of the place.

To create a unique ID, make it multipart, beginning with more general parts which are guaranteed to be unique. This way one creates namespaces, which make it easier after that to end up with a unique ID.

For expmple:

id="shop_cart_button_submit"

More than one of the same element, For example several tables on one page, each should have a unique ID.

If it has nested elements they can have the same selectors as in the other elements, but it’s not necessary.

## Implementing

The main thing is a `scenario`.

`Scenarios` consts of `steps.

### Clicking

All clicks wait for the selector by default and timeout w/ the standard timeout unless different is specified.

`timeout` It is recommended to have a standard timeout for the whole scenario and not to define spefici. `TODO`

auxta.clickByText `TO BE FIXED BY GEORGE TO ADD THE WAIT FOR SELECTOR WHICH IS MISSING`

auxta.clickByXPath

auxta.clickByClass

auxta.click() `THINK TO MAKE` `TODO`

waitforseelctorbytext `depreciated`

### Working with Tab

...

### Complex Workflows

#### Use Bulilding Blocks

Building Blocks do one simple thing each and allow you to build State Scripts and Scenrios.

#### Use State Scripts

State Scripts bring the system to a desired state from which a specific scenario begins.

#### Email

* (AuxTA) We do some action on the website.
* (Website) Sends an email to the email address of the user who did the action.
* (AuxTA) Should check that that the email was correctly sent. So we check:
    * `auxta.checkMail(_from_name_, _from_email_, _subject_, _body_text_)`
        * The email login is in the main config of the test suite.
            * email
            * API TOKEN
        * For the moment we do it synchroneous (AuxTA waits for the email).
        * The email must be newser than the time of the action on the Website.
        * Must be _from_name_ (substring)
        * Must be _from_email_ (substring)
        * Must have _subject_ (substring)
        * Must cotnain _body_text_ (substring)
        * Quality of Service, if the email does not arrive w/in eg. 5 minutes we return an error w/ timeout.
*
    * `auxta.clickInMail(_from_name_, _from_email_, _subject_, _click_on_)`

## Running

* Create a main function that calls the run() function which starts all tests
* Create a function for each test that calls the `auxtaPuppeteer.run(event, callback, featureName, scenarioName)`
  function

## Puppeteer

https://pptr.dev

https://github.com/puppeteer/puppeteer

## Install

npm i

## Setup

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
  "email": "string",
  "password": "string",
  "token": "string"
  # Screen width and height used in the testing
  # Allows testing from mobile devices screens
  "screenWidth": 1920,
  "screenHeight": 1080,
}

```

##backlog
Implement a way to scout the skipped steps w/ $failed=true, $skipped=++
control click go to source directory

##Improvements

* introduce the new headless mode, by Puppeteer.

### platform improvements

Also some improvements to the platform in general:

* get the console state after a fail, this would increase the value of each failed report.
