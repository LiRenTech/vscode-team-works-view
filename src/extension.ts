// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { TeamPanelProvider } from './teamPanelProvider';
import { TeamStatusWebviewProvider } from './teamStatusWebviewProvider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vscode-team-works-view" is now active!');

	// 注册侧边栏视图
	const teamPanelProvider = new TeamPanelProvider();
	const treeView = vscode.window.createTreeView('teamWorksPanel', {
		treeDataProvider: teamPanelProvider,
		showCollapseAll: false
	});

	context.subscriptions.push(treeView);

	// 注册刷新命令
	const refreshCommand = vscode.commands.registerCommand('vscode-team-works-view.refreshTeamPanel', () => {
		teamPanelProvider.refresh();
	});

	// 注册查看今日团队情况命令
	const viewTodayTeamStatusCommand = vscode.commands.registerCommand('vscode-team-works-view.viewTodayTeamStatus', () => {
		TeamStatusWebviewProvider.createOrShow(context);
	});

	// 保留原有的 helloWorld 命令（可选）
	const helloWorldCommand = vscode.commands.registerCommand('vscode-team-works-view.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from vscode-team-works-view!');
	});

	context.subscriptions.push(refreshCommand, viewTodayTeamStatusCommand, helloWorldCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {}
