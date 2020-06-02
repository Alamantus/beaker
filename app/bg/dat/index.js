import { app } from 'electron'
import * as childProcess from 'child_process'
import { tmpdir } from 'os'
import { join } from 'path'
import mkdirp from 'mkdirp'
import rimraf from 'rimraf'
import pda from 'pauls-dat-api2'
import hyper from '../hyper/index'
import * as filesystem from '../filesystem/index'

export function getStoragePathFor (key) {
  return join(tmpdir(), 'dat', key)
}

var downloadPromises = {}
export async function downloadDat (key) {
  if (downloadPromises[key]) {
    return downloadPromises[key]
  }

  var storagePath = getStoragePathFor(key)
  rimraf.sync(storagePath)
  mkdirp.sync(storagePath)

  downloadPromises[key] = runConvertProcess(
    app.getPath('userData'),
    key,
    storagePath
  )

  return downloadPromises[key]
}

var convertPromises = {}
export function convertDatArchive (key) {
  if (convertPromises[key]) {
    return convertPromises[key]
  }
  
  convertPromises[key] = (async () => {
    await downloadDat(key)

    var storagePath = getStoragePathFor(key)
    var drive = await hyper.drives.createNewDrive()
    await pda.exportFilesystemToArchive({
      srcPath: storagePath,
      dstArchive: drive.session.drive,
      dstPath: '/',
      inplaceImport: true
    })
    await filesystem.configDrive(drive.url)
    return drive.url
  })()

  return convertPromises[key]
}

async function runConvertProcess (...args) {
  var fullModulePath = join(__dirname, 'bg', 'dat', 'converter', 'index.js')
  const opts = {
    stdio: 'inherit',
    env: Object.assign({}, process.env, {
      ELECTRON_RUN_AS_NODE: 1,
      ELECTRON_NO_ASAR: 1
    })
  }
  var proc = childProcess.fork(fullModulePath, args, opts)

  return new Promise((resolve, reject) => {
    proc.on('error', reject)
    proc.on('close', resolve)
  })
}
