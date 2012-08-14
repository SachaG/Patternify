/* Author: 
Sacha Greif
*/


$(document).ready(function(){


	
	
	
	$("#info").hide();
	
	$("#info-link").click(function(){
		$("#info").slideToggle();
		return false;
	});
	
	$("#base64-code").click(function(){
		$(this).select();
	});
	
	$("#shortURL").click(function(){
		$(this).select();
	});
	
	//---------------------------------------- PATTERN CONTROLS ------------------------------------------//
	
	//-------- COLOR PICKER ----------//
	colorSubmit=function(hsb, hex, rgb, el){
		el=$('#colorpicker');
		$(el).val(hex);
		color.r=rgb.r;
		color.g=rgb.g;
		color.b=rgb.b;
		$("#color-preview").css("background-color", "#"+hex);
	};
	$('#colorpicker').ColorPicker({
		onSubmit: colorSubmit,
		onChange: colorSubmit,
		livePreview: false,
		onBeforeShow: function () {
			$(this).ColorPickerSetColor(this.value);
		}
	})
	.bind('keyup', function(){
		$(this).ColorPickerSetColor(this.value);
		$("#color-preview").css("background-color", "#"+this.value);
		//see http://stackoverflow.com/questions/1740700/get-hex-value-rather-than-rgb-value-using-jquery
		var rgbColor=$("#color-preview").css('backgroundColor');
		rgbColor = rgbColor.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
		color.r=rgbColor[1];
		color.g=rgbColor[2];
		color.b=rgbColor[3];
	});	
	
	//-------- OPACITY SLIDER ----------//
	$( "#slider" ).slider({
		value:1,
		min: 0,
		max: 1,
		step: 0.1,
		slide: function( event, ui ) {
			$( "#opacity" ).val( ui.value );
			$( "#color-preview").css("opacity", ui.value);
			color.a=ui.value;
		}
	});
	$( "#opacity" ).change(function(){
		var opacity=$(this).val();
		$( "#slider" ).slider( "value" , opacity );
		$( "#color-preview").css("opacity", opacity);
		color.a=opacity;
	});
	

	//---------------------------------------- PRESETS ------------------------------------------//

	
	$("#getMatrix").click(function(){
		var grid=new Object();
		grid.matrix=matrix;
		grid.xcursor=xcursor;
		grid.ycursor=ycursor;		
		$("#base64-code").val($.toJSON(grid));
	});
	
	$(".patterns a").click(function(){
		clearCanvas();
		loadGrid($.secureEvalJSON($(this).text()));
		return false;
	});
	
	$("#presets-tabs").tabs();
	//---------------------------------------- CODE & PREVIEW ------------------------------------------//
	
	//Create a new clipboard client
	var clip = new ZeroClipboard.Client();
	clip.setText("somthing");
	clip.glue( 'copy-code' );
    clip.addEventListener( 'complete', function(client, text) {
		flashMessage("Copied CSS code to clipboard");
    });
	clip.addEventListener( 'mouseUp', function(client) { 
      	var copyString="background:url("+$("#base64-code").val()+");";
		clip.setText(copyString);
	} );
	$("#copy-code").click(function(){
		flashMessage("Sorry, you need Flash to copy text");
		return false;
	});
	
	$("#download-png").click(function(){
		Canvas2Image.saveAsPNG(patcanvas); 
		flashMessage("Don't forget to add the .png extension to the file"); 
		return false;
	});
	
	flashMessage=function(msg){
		$("#flash-message").text(msg).show().delay(3000).fadeOut(500);
	}
	
	$("#exportLink").click(function(){
		//var encodedGrid=encodeGrid();
		//$(this).attr("href", "#"+encodedGrid);
		$(".exportLoader").addClass("loading");
		getShortURL();
		return false;
	});
		
	getShortURL=function(){
		var patternURL=encodeURIComponent("http://www.patternify.com/#"+encodeGrid());
		//var patternURL=encodeURIComponent("http://twitter.com/#!/SachaGreif");
		var url="http://api.bitly.com/v3/shorten?login=koroshiya&apiKey=R_10e9d7c489e9a6c5e7823a4f338946d3&longUrl="+patternURL+"&format=txt";
		$.get(url, function(data) {
			$("#shortURL").val(data);
			$(".exportLoader").removeClass("loading");
		});
	}
	//---------------------------------------- DRAWING ------------------------------------------//
	// begin canvas drawing code

	//-------- MATRIX ----------//
	resetMatrix=function(m){
		for (var i = 0; i < xlength; i++) {
			m[i] = new Array(ylength);
			for(var j=0; j<ylength; j++){
				m[i][j]=0;
			}
		}
	};
	
	updateMatrix=function(newMatrix, xcursor, ycursor){
		resetMatrix(matrix);
		for (var i = 0; i < xcursor; i++) {
			for(var j = 0; j < ycursor; j++){
				matrix[i][j]=newMatrix[i][j];			
			}
		}
	};

	//-------- GRID ----------//
	
	loadGrid=function(grid){
		//set the cursors
		setCursors(grid.xcursor, grid.ycursor);
		//fill the matrix with the loaded matrix's values
		updateMatrix(grid.matrix, grid.xcursor, grid.ycursor);
		refreshGrid();
	};	
		
	clearGrid=function(){
		clearCanvas();
		resetMatrix(matrix);
		redrawPreview();
		$("#base64-code").val("");
	};
	
	//reload the grid from the matrix
	refreshGrid=function(){
		var canvas = $("#grid-canvas")[0];
		var context = canvas.getContext("2d");
		
		for (var i = 0; i < xlength; i++) {
			for(var j=0; j<ylength; j++){
				var tileColor=matrix[i][j];
				if(tileColor!=0){
					context.fillStyle = "rgba("+tileColor[0]+", "+tileColor[1]+", "+tileColor[2]+", "+tileColor[3]+")";
					context.fillRect(i*30, j*30, 30, 30);			
				}
			}
		}
		redrawPreview();		
	};
	
	encodeGrid=function(){
		var patternMatrix=Array();
		//copy the current xlength by ylength matrix to a smaller matrix that just fits the pattern
		for (var i = 0; i < xcursor; i++) {
			patternMatrix[i] = new Array(ycursor);
			for(var j=0; j<ycursor; j++){
				patternMatrix[i][j]=matrix[i][j];
			}
		}
		var grid=new Object();
		grid.matrix=patternMatrix;
		grid.xcursor=xcursor;
		grid.ycursor=ycursor;
		var JSONgrid = $.toJSON(grid); 
		var encodedGrid=lzw_encode(JSONgrid);
		return encodedGrid;
	};
	
	decodeGrid=function(encodedGrid){		
		return $.secureEvalJSON(lzw_decode(decodeURIComponent(encodedGrid)));
	};
	//-------- CANVAS ----------//
	
	clearCanvas=function(){
		var canvas = $("#grid-canvas")[0];
		canvas.width=canvas.width;		
	}
	
	//-------- PREVIEW & CODE ----------//

		
	redrawPreview=function(){
		//set width and height, which also clears the canvas
		patcanvas.width = xcursor;
		patcanvas.height = ycursor;

		for (var i = 0; i < xcursor; i++) {
			for(var j = 0; j < ycursor; j++){		
				if(matrix[i][j]!=0){
					tileColor=matrix[i][j];
					patcontext.fillStyle = "rgba("+tileColor[0]+", "+tileColor[1]+", "+tileColor[2]+", "+tileColor[3]+")";
					patcontext.fillRect(i, j, 1, 1);
				}
			}
		}

		//get the preview canvas and clear it as well
		var pcanvas=$("#preview-canvas")[0];
		pcanvas.width=pcanvas.width;
		var pcontext=pcanvas.getContext("2d");
		
		//create a pattern from the pattern canvas and fill the preview canvas with it
		var pattern = pcontext.createPattern(patcanvas, "repeat");		
		pcontext.rect(0,0,pcanvas.width,pcanvas.height);
		pcontext.fillStyle=pattern;
		pcontext.fill();	

		//also update the code
		var dataURL = patcanvas.toDataURL("image/png");
		$("#base64-code").val(dataURL);
	};
	
	

	
	function getCursorCoordinates(gCanvasElement, e) {
		var c=new Object();
	    var x;
	    var y;
	    if (e.pageX || e.pageY) {
			x = e.pageX;
			y = e.pageY;
	    }else {
			x = e.clientX + document.body.scrollLeft +
		            document.documentElement.scrollLeft;
			y = e.clientY + document.body.scrollTop +
		            document.documentElement.scrollTop;
	    }

	    // Convert to coordinates relative to the canvas
		var offset = $(gCanvasElement).offset();
	    x -= offset.left;
	    y -= offset.top;
		c.xpos=x;
		c.ypos=y;
		c.modx=x-x%30;
		c.mody=y-y%30;
		c.xcoord=c.modx/30;
		c.ycoord=c.mody/30;

	    return c
	};
	

	
	doAction=function(e) {
		var canvas = $("#grid-canvas")[0];
		var context = canvas.getContext("2d");
		// the "c" (for "coordinates") object holds the clicked tile's coordinates
		var c=getCursorCoordinates(canvas, e);

		// we consider three cases:
		// 1. mouse is down and either the x or y coordinate has changed
		// 2. mouse is up
		// 3. mouse is down with the same x and y coordinates
		// Only update for cases 1 and 2, not 3.
		if((mouseIsDown && (activePixel.x!=c.xcoord || activePixel.y!=c.ycoord)) || !mouseIsDown){
			activePixel.x=c.xcoord;
			activePixel.y=c.ycoord;
			tileColor=matrix[c.xcoord][c.ycoord];
	
			switch(mode){			
				case 1:
					//drawing mode
					matrix[c.xcoord][c.ycoord]=[color.r, color.g, color.b, color.a];
					context.fillStyle = "rgba("+color.r+", "+color.g+", "+color.b+", "+color.a+")";
					context.fillRect(c.modx, c.mody, 30, 30);
					redrawPreview();		
				break;
				
				case 2:
					//erasing mode
					matrix[c.xcoord][c.ycoord]=0;
					context.clearRect(c.modx, c.mody, 30, 30);
					redrawPreview();
				break;

				case 3:
					//eyedropper mode
					color.r=tileColor[0];
					color.g=tileColor[1];
					color.b=tileColor[2];
					color.a=tileColor[3];
					$('#colorpicker').ColorPickerSetColor({r:color.r, g:color.g, b:color.b});
					$("#color-preview").css("background-color", "rgb("+color.r+","+color.g+","+color.b+")");
				break;
				
				case 4:
					//move mode
					
				break;
			}			
		}
	};
	

	
	sameColor=function(obj,arr){
		if(obj.r==arr[0] && obj.g==arr[1] && obj.b==arr[2] && obj.a==arr[3]){
			return true;
		}
		return false;
	};

	setMode=function(modeName){
		$(".tools a").removeClass("active");
		$("#"+modeName).addClass("active");
		switch(modeName){
			case "pencil":
				mode=1;
			break;
			case "eraser":
				mode=2;
			break;
			case "eyedropper":
				mode=3;
			break;
			case "move":
				mode=4;
			break;
			case "clear":
				if (confirm("Clear your pattern?")){
					clearGrid();
				}
			break;			
		}
	}
	
	var mouseIsDown=false;
	$("#grid-canvas").mousedown(function(e){
		var canvas = $("#grid-canvas")[0];
		var c=getCursorCoordinates(canvas, e);
		// if we are currently in drawing mode, but are starting from a tile
		// that is the same color as the active color, 
		// switch to erasing mode until the next mouseUp
		if(mode==1 && sameColor(color,matrix[c.xcoord][c.ycoord])){
			setMode("eraser");
			$("#grid-canvas").one("mouseup", function(){
				setMode("pencil");
			});		
		}else if(mode==3){
			// eyedropper mode is temporary and switches back automatically
			$("#grid-canvas").one("mouseup", function(){
				setMode("pencil");
			});				
		}
		doAction(e);
		mouseIsDown=true;
	}).mousemove(function(e){
		if(mouseIsDown){
			doAction(e);
		}
	});
	$("body").mouseup(function(e){
		mouseIsDown=false;
	});
	
	$(".tools a").click(function(){
		setMode($(this).attr("id"));
		return false;
	});
		
	setCursors=function(xcursorIndex,ycursorIndex){
		var rmask=$(".rightmask");
		var bmask=$(".bottommask");
		var xcursorLi=$(".cols li:nth-child("+xcursorIndex+")");
		var ycursorLi=$(".rows li:nth-child("+ycursorIndex+")");
		$(".cursors .selected").removeClass("selected");		
		xcursorLi.addClass("selected");
		ycursorLi.addClass("selected");	
				
		//update the global variables
		xcursor=xcursorIndex;			
		ycursor=ycursorIndex;
		bmask.width(xcursorIndex*30);
		bmask.height(300-ycursorIndex*30);
		rmask.width(300-xcursorIndex*30);
		
		redrawPreview();
	};
	
	$(".cursors a").click(function(){
		//get the index of the clicked cursor	
		var index=$(this).parent().index()+1;
		var ul=$(this).parents("ul");
		//set one cursor or the other
		if(ul.hasClass("cols")){			
			setCursors(index, ycursor);
		}else{			
			setCursors(xcursor, index);
		}
		return false;
	});	
	
	//drawing modes
	// 1: draw
	// 2: erase
	// 3: eyedropper
	
	var mode=1;
	
	var color=new Object();
	color.r=0;
	color.g=0;
	color.b=0;
	color.a=1;
		
	//set default cursor position at 5	
	var xcursor=5;
	var ycursor=5;
	var xlength=10;
	var ylength=10;
	var activePixel=new Object();
	activePixel.x=0;
	activePixel.y=0;
	var matrix=new Array(xlength);
	resetMatrix(matrix);

	//create a new canvas element to hold the sized down pattern
	var patcanvas = document.createElement('canvas');
	var patcontext = patcanvas.getContext('2d');
	
	var hash=window.location.hash;
	if(hash){
		//remove the first character, which is always "#"
		loadGrid(decodeGrid(hash.substr(1)));
	}
});






















