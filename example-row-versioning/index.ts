import { html } from 'htm/preact'
import { FunctionComponent, render } from 'preact'
import {
    Primary as ButtonOutlinePrimary,
    ButtonOutline
} from '@nichoth/components/htm/button-outline'
import { State } from './state.js'
import '@nichoth/components/button-outline.css'

const state = await State()

const Example:FunctionComponent = function () {
    function plus (ev) {
        ev.preventDefault()
        State.Increase(state)
    }

    function minus (ev) {
        ev.preventDefault()
        State.Decrease(state)
    }

    return html`<div class="example">
        <div>
            <strong>count: </strong>${state.count}
        </div>
        <ul class="count-controls">
            <li><${ButtonOutlinePrimary} onClick=${plus}>Plus<//></li>
            <li><${ButtonOutline} onClick=${minus}>Minus<//></li>
        </ul>
    </div>`
}

render(html`<${Example} />`, document.getElementById('root')!)
