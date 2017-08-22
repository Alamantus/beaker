/* globals beaker */

const yo = require('yo-yo')
const moment = require('moment')
import renderSidebar from '../com/sidebar'
import renderTrashIcon from '../icon/trash'
import renderCloseIcon from '../icon/close'

// globals
// =

// how many px from bottom till more is loaded?
const BEGIN_LOAD_OFFSET = 500
// how many to load in a batch?
const BATCH_SIZE = 20

// visits, cached in memory
var visits = []
var isAtEnd = false
var query = ''
var currentPeriodFilter = 'all'

// main
// =

render()
fetchMore(render)
document.body.querySelector('.window-content').addEventListener('scroll', onScrollContent)

// data
// =

var isFetching = false
function fetchMore (cb) {
  if (isFetching) return
  if (isAtEnd) return cb()

  loadVisits(visits.length, cb)
}

async function loadVisits (offset, cb) {
  // reset isAtEnd if starting from 0
  if (offset === 0) {
    isAtEnd = false
  }

  isFetching = true
  var rows = await beaker.history.getVisitHistory({ offset, limit: BATCH_SIZE, search: query ? query : false })
  let numFetched = rows.length
  if (currentPeriodFilter !== 'all') {
    // apply day filter
    let lastTs
    let day = moment()
    if (currentPeriodFilter === 'yesterday') {
      day = day.subtract(1, 'day')
    }
    rows = rows.filter(r => {
      let ts = moment(r.ts)
      lastTs = ts
      return ts.isSame(day, 'day')
    })

    // did we reach the end?
    if (numFetched < BATCH_SIZE || lastTs.isBefore(day, 'day')) {
      isAtEnd = true
    }
  } else {
    // did we reach the end?
    if (rows.length === 0) {
      isAtEnd = true
    }
  }

  if (offset > 0) {
    // append to the end
    visits = visits.concat(rows)
  } else {
    // new results
    visits = rows
  }

  isFetching = false
  cb()
}

// rendering
// =

function renderRows () {
  var rowEls = []
  var lastDate = moment().startOf('day').add(1, 'day')

  visits.forEach((row, i) => {
    // render a date heading if this post is from a different day than the last
    var oldLastDate = lastDate
    lastDate = moment(row.ts).endOf('day')
    if (!lastDate.isSame(oldLastDate, 'day')) {
      rowEls.push(yo`<h2>${ucfirst(niceDate(lastDate, { noTime: true }))}</h2>`)
    }

    // render row
    rowEls.push(renderRow(row, i))
  })

  // empty state
  if (rowEls.length == 0) {
    rowEls.push(yo`<em class="empty">No results</em>`)
  }

  return rowEls
}

function renderRow (row, i) {
  return yo`
    <div class="ll-row">
      <a class="link" href=${row.url} title=${row.title}>
        <img class="favicon" src=${'beaker-favicon:' + row.url}/>
        <span class="title">${row.title.replace(/[^\x00-\x7F]/g, "")}</span>
        <span class="url">${row.url}</span>
      </a>
      <div class="actions">
        <div class="action" onclick=${onClickDelete.bind(window, i)} title="Remove from history">
          ${renderTrashIcon()}
        </div>
      </div>
    </div>`
}

function renderHistoryListing () {
  yo.update(document.querySelector('.links-list.history'), yo`
    <div class="links-list history">
      ${renderRows()}
    </div>`)
}

function render () {
  yo.update(
    document.querySelector('.history-wrapper'),
    yo`
      <div class="history-wrapper builtin-wrapper">
        ${renderSidebar('history')}
        <div>
          <div class="builtin-sidebar">
            <h1>History</h1>
            <div class="section">
              <div onclick=${onUpdatePeriodFilter} data-period="all" class="nav-item ${currentPeriodFilter === 'all' ? 'active' : ''}">
                All history
              </div>
              <div onclick=${onUpdatePeriodFilter} data-period="today" class="nav-item ${currentPeriodFilter === 'today' ? 'active' : ''}">
                Today
              </div>
              <div onclick=${onUpdatePeriodFilter} data-period="yesterday" class="nav-item ${currentPeriodFilter === 'yesterday' ? 'active' : ''}">
                Yesterday
              </div>
            </div>
          </div>

          <div class="builtin-main">
            <div class="builtin-header fixed">
              <div class="search-container">
                <input required autofocus onkeyup=${onUpdateSearchQuery} placeholder="Search your browsing history" type="text" class="search"/>
                <span onclick=${onClearQuery} class="close-container">
                  ${renderCloseIcon()}
                </span>
              </div>

              <div class="btn" onclick=${onClickDeleteBulk.bind(window)}>
                Clear browsing history
              </div>

              <select id="delete-period">
                <option value="day" selected>from today</option>
                <option value="week">from this week</option>
                <option value="month">from this month</option>
                <option value="all">from all time</option>
              </select>
            </div>

            <div class="links-list history">
              ${renderRows()}
            </div>
          </div>
        </div>
      </div>`)
}

// event handlers
// =

function onUpdateSearchQuery (e) {
  if (e.code === 'Enter') {
    query = e.target.value.toLowerCase()
    loadVisits(0, render)
  }
}

async function onClearQuery () {
  document.querySelector('input.search').value = ''
  query = ''
  loadVisits(0, render)
}

function onUpdatePeriodFilter (e) {
  // reset the search query
  query = ''
  document.querySelector('input.search').value = ''

  currentPeriodFilter = e.target.dataset.period
  loadVisits(0, render)
}

function onScrollContent (e) {
  if (isAtEnd) { return }

  var el = e.target
  if (el.offsetHeight + el.scrollTop + BEGIN_LOAD_OFFSET >= el.scrollHeight) {
    // hit bottom
    fetchMore(render)
  }
}

function onClickDelete (i) {
  // remove
  var v = visits[i]
  visits.splice(i, 1)
  beaker.history.removeVisit(v.url)
  render()
}

function onClickDeleteBulk () {
  var period = document.querySelector('#delete-period').value

  // clear all history
  if (period === 'all') {
    visits = []
    beaker.history.removeAllVisits()
    render()
  } else {
    var threshold = moment().startOf(period).valueOf()

    // filter out visits that with a timestamp >= threshold
    visits = visits.filter(v => v.ts < threshold)
    beaker.history.removeVisitsAfter(threshold)

    // fetch and render more visits if possible
    fetchMore(render)
  }
}

// internal methods
// =

function ucfirst (str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function niceDate (ts, opts) {
  const endOfToday = moment().endOf('day')
  if (typeof ts == 'number') { ts = moment(ts) }
  if (ts.isSame(endOfToday, 'day')) {
    if (opts && opts.noTime) { return 'today' }
    return ts.fromNow()
  } else if (ts.isSame(endOfToday.subtract(1, 'day'), 'day')) { return 'yesterday' } else if (ts.isSame(endOfToday, 'month')) { return ts.fromNow() }
  return ts.format('ll')
}
