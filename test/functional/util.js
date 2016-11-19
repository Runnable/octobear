'use strict'
require('loadenv')()
const Promise = require('bluebird')
const Runnable = require('@runnable/api-client')
const uuid = require('uuid')

const randomInt = Math.floor(Math.random() * 1000)

// Helper method
const promisifyClientModel = (obj) => {
  const hasProp = {}.hasOwnProperty
  for (var key in obj) {
    ((key) => {
      if (hasProp.call(obj, key + 'Async') !== false) {
        return
      }
      if (typeof obj[key] === 'function') {
        let myFunc = function () {
          let results
          return Promise.fromCallback((cb) => {
            const args = [].slice.call(arguments)
            args.push(cb)
            results = obj[key].apply(obj, args)
          })
            .return(results)
        }
        obj[key + 'Async'] = myFunc
      }
    })(key)
  }
  return obj
}

// Replace Name
const sanitizeName = x => x.replace(/[^a-zA-Z0-9]/g, '-')

const client = new Runnable(process.env.API_URL, { userContentDomain: process.env.USER_CONTENT_DOMAIN })
promisifyClientModel(client)

const deleteInstances = (githubUsername, matchRegex) => {
  let instancesToDelete
  return client.githubLoginAsync(process.env.GITHUB_ACCESS_TOKEN)
  .then(() => {
    return client.fetchInstancesAsync({ githubUsername })
  })
  .then((instances) => {
    instancesToDelete = instances.models
      .filter((x) => x.attrs.name.match(matchRegex))
      .map((x) => promisifyClientModel(x))
  })
  .then(() => {
    if (!instancesToDelete.length === 0) return Promise.resolve()
    return Promise.all(instancesToDelete.map(x => x.destroyAsync()))
  })
}

const createContextVersionAndInstance = ({ instanceSpec, contextVersionSpec, files, repo }) => {
  let sourceContext
  let sourceContextVersion
  let sourceInfraCodeVersion
  let context
  let contextVersion
  let contextVersionDockerfile
  let build
  let instance
  let githubRepo
  let githubBranch

  return client.githubLoginAsync(process.env.GITHUB_ACCESS_TOKEN)
  // Fetch github branch
  .then(() => {
    const githubOrg = Promise.promisifyAll(client.newGithubOrg(process.env.GITHUB_USERNAME))
    const reqOpts = { headers: { 'User-Agent': 'runnable-docker-compose-functional-test' } }
    return githubOrg.fetchRepoAsync(repo, reqOpts)
    .then((_githubRepo) => {
      githubRepo = Promise.promisifyAll(client.newGithubRepo(_githubRepo))
      return githubRepo.fetchBranchAsync('master', reqOpts)
    })
    .then((_branch) => {
      githubBranch = _branch
    })
  })
  // Fetch Context
  .then(() => {
    return client.fetchContextsAsync({ isSource: true })
  })
    .then((sourceContexts) => {
      sourceContext = sourceContexts.models.find((x) => x.attrs.lowerName.match(/blank/i))
      promisifyClientModel(sourceContext)
      return sourceContext.fetchVersionsAsync({ qs: { sort: '-created' } })
    })
    .then((versions) => {
      sourceContextVersion = versions.models[0]
      promisifyClientModel(sourceContextVersion)
      sourceInfraCodeVersion = sourceContextVersion.attrs.infraCodeVersion
      promisifyClientModel(sourceInfraCodeVersion)
    })
    // Context & Context Version
    .then(() => {
      return client.createContextAsync({
        name: uuid.v4(),
        'owner.github': process.env.GITHUB_OAUTH_ID,
        owner: {
          github: process.env.GITHUB_OAUTH_ID
        }
      })
    })
    .then((results) => {
      context = results
      promisifyClientModel(context)
      return context.createVersionAsync({
        source: sourceContextVersion.attrs.id
      })
    })
    .then((returned) => {
      contextVersion = returned
      promisifyClientModel(contextVersion)
      return contextVersion.updateAsync(contextVersionSpec)
    })
    .then(() => {
      return contextVersion.deepCopyAsync()
    })
    .then(() => {
      return contextVersion.copyFilesFromSourceAsync(sourceInfraCodeVersion)
    })
    .then(() => {
      if (!files) return null
      return contextVersion.copyFilesFromSourceAsync(sourceInfraCodeVersion)
      .then(() => {
        return sourceContextVersion.fetchFileAsync('/Dockerfile')
      })
      .then((dockerfile) => {
        contextVersionDockerfile = Promise.promisifyAll(contextVersion.newFile(dockerfile))
        return contextVersionDockerfile.updateAsync({
          json: {
            body: files['/Dockerfile'].body
          }
        })
      })
    })
    .then(() => {
      if (!contextVersionSpec.buildDockerfilePath) return null
      const opts = {
        repo: githubRepo.attrs.full_name,
        branch: githubBranch.name,
        commit: githubBranch.commit.sha
      }
      return contextVersion.createAppCodeVersionAsync(opts)
    })
    // Builds and instances
    .then(() => {
      return client.createBuildAsync({
        contextVersions: [contextVersion.id()],
        owner: {
          github: process.env.GITHUB_OAUTH_ID
        }
      })
    })
    .then((rtn) => {
      build = rtn
      promisifyClientModel(build)
      build.contextVersion = contextVersion
      return build.fetchAsync()
    })
    .then(() => {
      return build.buildAsync({
        message: 'Initial Build'
      })
    })
    .then(() => {
      const opts = Object.assign({
        masterPod: true,
        name: sanitizeName(repo) + '--' + randomInt,
        ipWhitelist: {
          enabled: false
        },
        owner: {
          github: process.env.GITHUB_OAUTH_ID
        },
        build: build.id()
      }, instanceSpec)
      return client.createInstanceAsync(opts)
    })
    .catch(err => {
      if (err.message.match(/not.*started.*building/) && build.attrs.failed) {
        throw new Error('Build Failed and intance cannot be created')
      }
      throw err
    })
    .then((rtn) => {
      instance = rtn
      promisifyClientModel(instance)
      return instance.fetchAsync()
    })
}

module.exports.createContextVersionAndInstance = createContextVersionAndInstance
module.exports.deleteInstances = deleteInstances
