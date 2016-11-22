# OctoBear

_Docker Compose File parser for Runnable API Client_

![http://1.bp.blogspot.com/-aEL7JOFG33A/UxyzFBJ0RXI/AAAAAAAADus/4jmeE4FR3_g/s1600/5455426064_fca9750514_o.jpg](http://1.bp.blogspot.com/-aEL7JOFG33A/UxyzFBJ0RXI/AAAAAAAADus/4jmeE4FR3_g/s1600/5455426064_fca9750514_o.jpg)

## Usage

This module provides only one function: `parse`

```
const octobear = require('@runnable/octobear')

octobear.parse({
  dockerComposeFileString: String, // String for `docker-comopse.yml`
  repositoryName: String, // Name or repository. Used for naming the instances (Doesn't have to  correlate 1-to-1)
  ownerUsername: String, // User's github username. Used for pre-instance creationt hostname generation
  userContentDomain: String // Runnable API user content domain. Used for pre-instance creationt hostname generation
})
.then(results => )
```

The response correspond to the following schema:

```
{
	results: [{
		metadata: {
			name: String, // Name specified for service in `docker-compose.yml`
			isMain: Boolean, // Wether this should be the instance for which a repo instance should be created
		},
		contextVersion: {
			advanced: Boolean, // Always `true`. All instances created will be advanced instances
			buildDockerfilePath: String // Optional. Path for Dockerfile used to build instance
		}),
		files: { // Optional
		 '/Dockerfile': {
				body: String // Body for Dockerfile to be used. Only specified if there is  no `contextVersion.buildDockerfilePath`
			}
		},
		instance: {
			name: String, // Instance name. Different from name specified in `docker-compose.yml`,
			containerStartCommand: String, // Optional. Command provided to start instance
			ports: Array<Number>, // Array of number for ports
			env: Array<String> // Array of strings for env variables. Includes hostname substitution
		}
	}]
}
```

## Tests

There are three types of tests:

1. Unit: Used to test individual functions
2. Functional: Used to test the complete flow of a function. This should not use any external services.
3. Integration: Used to test results of parsing against the Runnable API
