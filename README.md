# OctoBear

_Docker Compose File parser for Runnable API Client_

![http://1.bp.blogspot.com/-aEL7JOFG33A/UxyzFBJ0RXI/AAAAAAAADus/4jmeE4FR3_g/s1600/5455426064_fca9750514_o.jpg](http://1.bp.blogspot.com/-aEL7JOFG33A/UxyzFBJ0RXI/AAAAAAAADus/4jmeE4FR3_g/s1600/5455426064_fca9750514_o.jpg)

## Usage

This module provides two functions:

#### `parse`

```
const octobear = require('@runnable/octobear')

octobear.parse({
  dockerComposeFileString: String, // String for `docker-compose.yml`
  repositoryName: String, // Name or repository. Used for naming the instances (Doesn't have to  correlate 1-to-1)
  ownerUsername: String, // User's github username. Used for pre-instance creation hostname generation
  userContentDomain: String // Runnable API user content domain. Used for pre-instance creation hostname generation
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
    // optional
		code: {
			repo: 'String', // repo full name
                        commitish: 'String' // Optional. Commit or branch
		}),
    build: {
      dockerFilePath: String, // Optional. Path for Dockerfile used to build instance,
      dockerBuildContext: String, // Optional. Path for Docker build context
    },
		files: { // Optional
		 '/Dockerfile': {
				body: String // Body for Dockerfile to be used. Only specified if there is  no `buildDockerfilePath`
			}
		},
		instance: {
			name: String, // Instance name. Different from name specified in `docker-compose.yml`,
			containerStartCommand: String, // Optional. Command provided to start instance
			ports: Array<Number>, // Array of number for ports
			env: Array<String> // Array of strings for env variables. Includes hostname substitution
		}
	}]
  envFiles: [String] // Array of all ENV files that should be loaded
}
```

#### `populateENVsFromFiles`

```
const octobear = require('@runnable/octobear')

octobear.parse({ ...  })
.then(({ results: services, envFiles }) =>  {
  const envFiles = getAllTheseFilesAsHashTable(res.envFiles) // An object with filesnames as keys and strings as values
  return populateENVsFromFiles(services, envFiles)
})
.then(services => { ... })
```

## Tests

In order to run tests locally you also need to pull submodules. The easiest way to do that is cloning repo with
` --recursive` flag:

```
  git clone --recursive git@github.com:Runnable/octobear.git
```

To update them, use
```
git submodule update --init --recursive
```

Also, in order to run tests locally you'll need populate the environment variables in `configs/.env`. We suggest adding them to `configs/.env.test`.

There are three types of tests:

1. Unit: Used to test individual functions
2. Functional: Used to test the complete flow of a function. This should not use any external services.
3. Integration: Used to test results of parsing against the Runnable API

### Adding Submmodules

1. Go into `test/repos/${NAME}`
2. Run `git init`
3. Run `git add -A`
4. Run `git commit -m ""`
5. Create repo in github
6. Push changes to github
7. `rm -rf test/repos/${NAME}` (It's in github, don't worry)
8. git submodule add git@github.com:RunnableTest/${NAME}.git test/repos/${NAME}
9. Run `git status` and make sure repo was added to `.gitmodules` and was added
10. Add + Commit + Push octobear repo
