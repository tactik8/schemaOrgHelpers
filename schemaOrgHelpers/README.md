# schemaOrgHelpers

JS library forjsonld

## Location

### Source code
https://github.com/tactik8/schemaOrgHelpers

### repl.it
https://replit.com/@tactik8/schemaOrgHelpers


## Install

### From github
```
git clone https://github.com/tactik8/schemaOrgHelpers ./utils/jsonldHelpers
```

## How to use

### make available to import  
#### add in package.json 
``` 
imports: {
    "#schemaOrgHelpers": "./utils/schemaOrgHelpers/schemaOrgHelpers/schemaOrgHelpers.js",
}
```

#### or in html file
```
<script type="importmap">
    {
      "imports": {
        "#schemaOrgHelpers": "/utils/schemaOrgHelpers/schemaOrgHelpers/schemaOrgHelpers.js"
      }
    }
  </script>


```



## Test and publish

```
npm install --save-dev jest

npm install --save-dev babel-jest @babel/core @babel/preset-env
npm install --save-dev jest-environment-jsdom

node --experimental-vm-modules node_modules/.bin/jest

npx parcel build
npm adduser
npm publish

```



## How to use

```
import { jsonldHelpers as jh } from 'https://tactik8.github.io/krakenJsSchema/kraken_schema/kraken_schema.js'

let record = {
    "@context": "https://schema.org/",
    "@type": "Thing",
    "@id": "thing1",
    "name": "thing1"
}


let k = jh.value.get(record, '@type')


```



## Tests

Prompt:
```
please write jest unit tests for all functions in @arrayHelpers.js. The tests records used should be jsonld records (nested) using schema.org. Please separate the tests one directory by file and one file by function. Please consider edge cases (invalid, null, wrong type, etc.).
```


## Running tests
node --experimental-vm-modules node_modules/.bin/jest

