SyntaxHighlighter.brushes.Gherkin = function()
{
	var keywords	= 'Given When Then And';

	this.regexList = [
		{ regex: SyntaxHighlighter.regexLib.singleLinePerlComments,			css: 'comments' },
		{ regex: /@.*$/gmi,													css: 'comments' },
		{ regex: /Feature:/gmi,												css: 'keyword' },
		{ regex: new RegExp(this.getKeywords(keywords), 'gmi'),				css: 'variable' },
		{ regex: /Scenario:/gmi,											css: 'keyword' },
		{ regex: /In order to/gmi,											css: 'variable' },
		{ regex: /As an?/gmi,												css: 'variable' },
		
		{ regex: /I want to/gmi,											css: 'variable' },
		{ regex: /I wish to/gmi,											css: 'variable' },
		{ regex: /So that/gmi,												css: 'variable' }
		];
};
SyntaxHighlighter.brushes.Gherkin.prototype = new SyntaxHighlighter.Highlighter();
SyntaxHighlighter.brushes.Gherkin.aliases    = ['gherkin', 'ghrkn'];
