function ShowHidePre(id) { 
	var state = document.getElementById(id).style.display; 
	if (state == 'block') {
		state = 'none';
	} else {
		state = 'block';
	}
	document.getElementById(id).style.display = state;
}