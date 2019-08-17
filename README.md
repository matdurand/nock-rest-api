# nock-uri-template

This library provides an extension to the [nock](https://github.com/nock/nock) library to make it easy to mock urls
using uri templates instead of using only regexes with nock.

## Installation

For NPM:

```
npm install --save-dev nock-uri-template
```

For yarn

```
yarn add nock-uri-template -D
```

## URI Template

The first step is to determine the API urls you want to mock. To do so, you must use the uri template standard.

Here are some examples of uri templates:

- /products/{id}{?category} would match
  - /products/1
  - /products/11
  - /products/1?category=true
- /products/{type}/{category}
  - /products/tools/electric

Under the hood, nock-uri-template uses [this library](https://github.com/geraintluff/uri-templates) to match uri templates.

## Mocking an api

Here is an example of how to mock an API

```
const scope = nockUriTemplate("http://localhost:4001")
  .get("/api/products/{id}")
  .reply(
    (params: any): Response => ({
      payload: { id: "1" }
    })
  );
```

The first line is used to specify the base url of the service. This base url must match the config used for your http
calls in your code.

The second line specify we want to mock GET requests to the specified path.

The third line uses a function to create the return payload. The object returned by the function can have a `code`
property for the http return code, and a `payload` property if there is a payload to return. If no code is provided,
a 200 will be returned if there is a payload, and a 204 if there is no payload.

### Limit the number of calls

Using the `reply` method will make the mock API reply to an unlimited number of calls. If you want to limit the number
of calls the mock API will reply to, you can use `replyOnce` or `replyTimes` method and provide a maximum number.

## Expectations

Whatever test runner you are using, nock-uri-template provides an object to make assertions on. Using the object returned by
`nockUriTemplate`, you can expect on the calls made to the api. The following examples are using Jest, but they work with
any runner.

### Expecting on calls made using certain parameters

This would expect that one call was made to our api endpoint using the parameter id=1

```
expect(scope.forParams({ id: "1" }).times()).toBe(1);
```

We could also verify that no calls were made except the call to id=1

```
expect(scope.notForParams({ id: "1" }).times()).toBe(0);
expect(scope.notForParams({ id: "1" }).urls()).toEqual([]);
```

The two lines test the same assertion, but it's easier to debug using the `urls` method, because
the runner will print the difference between the two arrays, which will print out the list of urls that were not
supposed to be called.
