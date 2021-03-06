import {css} from '../../vendor/lit-element/lit-element.js'

const cssStr = css`
.heading,
.row {
  display: flex;
  padding: 0 20px;
  justify-content: flex-start;
  align-items: center;
}

.heading {
  height: 40px;
}

.heading span {
  cursor: pointer;
}

.row {
  height: 50px;
  background: #fff;
  border: 1px solid #e6e6e6;
}

.row:not(:last-of-type) {
  border-bottom: 0;
}

.row:hover {
  background: #fafafa;
}

.row.selected {
  background: rgba(40, 100, 220, 0.1);
  border-color: #c3d4f5;
}

.row.selected + .row {
  border-top: 1px solid #c3d4f5;
}

.row.selected:hover {
  background: rgba(40, 100, 220, 0.15);
}

a.row {
  text-decoration: none;
  color: inherit;
}

.col {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 5px;
  vertical-align: middle;
}
`
export default cssStr
