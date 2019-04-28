import * as uuid from 'uuid';

import { BoxPanel, Widget } from '@phosphor/widgets';

import { Message } from '@phosphor/messaging';

import { ISignal, Signal } from '@phosphor/signaling';

import { IEditorFactoryService } from '@jupyterlab/codeeditor';

import { Toolbar } from '@jupyterlab/apputils';

import * as Api from '../api';

import { JupyterLabSqlPage, PageName } from '../page';

import { Response, IResponse } from './response';

import { Editor, IEditor } from './editor';


// TODO: Loading indicator on toolbar

namespace QueryPage {
  export interface IOptions {
    editorFactory: IEditorFactoryService,
    connectionUrl: string;
    initialSqlStatement: string;
  }
}

export class QueryPage implements JupyterLabSqlPage {
  constructor(options: QueryPage.IOptions) {
    this._content = new Content(options)
  }

  get content(): Widget {
    return this._content
  }

  readonly pageName = PageName.CustomQuery
  readonly toolbar: Toolbar = new Toolbar()
  private readonly _content: Content
}

class Content extends BoxPanel {
  constructor(options: QueryPage.IOptions) {
    super();

    this.addClass('p-Sql-MainContainer')

    this.editor = new Editor(options.initialSqlStatement, options.editorFactory);
    this.response = new Response();

    this.editor.execute.connect((_, value: string) => {
      this.updateGrid(options.connectionUrl, value);
    });
    this.editor.valueChanged.connect((_, value) => {
      this._sqlStatementChanged.emit(value);
    });

    this.addWidget(this.editor.widget);
    this.addWidget(this.response.widget);
    BoxPanel.setStretch(this.editor.widget, 1);
    BoxPanel.setStretch(this.response.widget, 3);
  }

  get sqlStatementChanged(): ISignal<this, string> {
    return this._sqlStatementChanged;
  }

  get sqlStatementValue(): string {
    return this.editor.value;
  }

  onActivateRequest(_: Message) {
    this.editor.widget.activate();
  }

  private async updateGrid(connectionUrl: string, sql: string): Promise<void> {
    const thisRequestId = uuid.v4();
    this._lastRequestId = thisRequestId;
    const data = await Api.getForQuery(connectionUrl, sql);
    if (this._lastRequestId === thisRequestId) {
      // Only update the response widget if the current
      // query is the last query that was dispatched.
      this.response.setResponse(data);
    }
  }


  readonly editor: IEditor;
  readonly response: IResponse;
  private _lastRequestId: string;
  private _sqlStatementChanged = new Signal<this, string>(this);

}