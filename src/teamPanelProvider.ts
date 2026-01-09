import * as vscode from 'vscode';

export class TeamPanelItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly commandId: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState
	) {
		super(label, collapsibleState);
		this.command = {
			command: `vscode-team-works-view.${commandId}`,
			title: this.label,
			arguments: [this]
		};
		this.tooltip = this.label;
		this.contextValue = 'teamPanelItem';
	}
}

export class TeamPanelProvider implements vscode.TreeDataProvider<TeamPanelItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<TeamPanelItem | undefined | null | void> = new vscode.EventEmitter<TeamPanelItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<TeamPanelItem | undefined | null | void> = this._onDidChangeTreeData.event;

	constructor() {}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: TeamPanelItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: TeamPanelItem): Thenable<TeamPanelItem[]> {
		// 返回一个包含按钮的项
		return Promise.resolve([
			new TeamPanelItem('查看今日团队情况', 'viewTodayTeamStatus', vscode.TreeItemCollapsibleState.None)
		]);
	}
}

