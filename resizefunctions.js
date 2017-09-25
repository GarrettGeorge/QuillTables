var rowTop;
  var rowBottom;
  var colRight;
  var $rowToResize;
  $(".ql-editor").mousemove(
    $.throttle(100, function(event) {
      if($(".ql-table-column-resizer-guide").css("display") === "block" ||
        $(".ql-table-row-resizer-guide").css("display") === "block"
      ) { return }
      var x = event.clientX;
      var y = event.clientY;
      var ele = document.elementFromPoint(x,y);
      var editor = document.querySelector(".ql-editor");
      while(ele != editor && ele != null) {
        if(ele.tagName === "TD") {
          break;
        }
        ele = ele.parentElement;
      }
      if(ele && ele.tagName == "TD") {
        var $ele = $(ele.parentElement);
        var height = $ele.outerHeight();
        var scrollTop     = $(window).scrollTop(),
          elementOffset = $ele.offset().top,
          distance      = (elementOffset - scrollTop);

        rowBottom = distance + height;
        rowTop = distance;
        
        var $rowResizer = $(".ql-table-row-resizer");

        if((y - distance) > height/2) {
          // Place resize helper at the bottom of the row
          $rowResizer.css({
            "top": distance + height - 63 - 4 + "px",
          })
        }
        else {
          // Place resize helper at the top of the row
          $rowResizer.css({
            "top": distance - 63 - 8 + 4 + "px",
          });
        }
        var $td = $(ele);
        var width = $td.outerWidth();
        var parentLeftOffset = $(".centralContainer").offset().left;
        var leftOffset = $td.offset().left - parentLeftOffset - 75;
        colRight = $td.offset().left + $td.outerWidth() - parentLeftOffset;

        var $colResizer = $(".ql-table-column-resizer");
        if((x - $td.offset().left) > width/2) {
          if(!$td.is(":nth-last-child(2)")) {
            // Place resizer helper on the right side of the column
            $colResizer.css({
              "left": leftOffset + width - 4 + "px",
              "height": $(ele.parentElement.parentElement).outerHeight() + "px",
              "top": $(ele.parentElement.parentElement).offset().top - 63 + "px",
              "display": "block"
            });
          }
          else {
            $colResizer.css("display", "none");
          }
        }
        else {
          if(!$td.is(":first-child")) {
            // Place resizer helper on the left side of the column
            $colResizer.css({
              "left": leftOffset - 4 + "px",
              "height": $(ele.parentElement.parentElement).outerHeight() + "px",
              "top": $(ele.parentElement.parentElement).offset().top - 63 + "px",
              "display": "block"
            });
          }
          else {
            $colResizer.css("display", "none");
          }
        }
      }
    })
  );

  var qlEditorDiv = document.querySelector(".ql-editor");
  var rowResizer = document.querySelector(".ql-table-row-resizer");
  rowResizer.onmousedown = function(event) {
    event.preventDefault();

    var topY = event.clientY - 9;
    var bottomY = event.clientY + 9;

    var topEle = document.elementFromPoint(event.x, topY);
    var bottomEle = document.elementFromPoint(event.x, bottomY);
    
    while(
      (topEle && topEle.tagName != "TR" && bottomEle) ||
      (bottomEle && bottomEle.tagName != "TR" && topEle) ||
      (topEle && topEle.tagName != "TR" && bottomEle && bottomEle.tagName != "TR") 
    ) {
      if(topEle && topEle.tagName != "TR") {
        topEle = topEle.parentElement;
      }
      if(bottomEle && bottomEle.tagName != "TR") {
        bottomEle = bottomEle.parentElement;
      }
    }
    
    if(topEle && topEle.tagName === "TR") {
      // Must verify top element is a table row when resizing top row
      $rowToResize = $(topEle);
    }
    else {
      $rowToResize = $(bottomEle);
    }
    let oldSelection = mainEditor.getSelection();
    window.getSelection().selectAllChildren($rowToResize[0]);
    let newSelection = mainEditor.getSelection();
    mainEditor.setSelection(oldSelection)

    $(".ql-table-row-resizer-guide").css("display", "block");

    let shiftY = event.clientY - rowResizer.getBoundingClientRect().top;

    var tableResizerTop = event.clientY;

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    function onMouseMove(event) {
        let newTop = event.clientY - 63

        let topEdge = qlEditorDiv.offsetTop;
        if (newTop < topEdge) {
          newTop = topEdge;
        }

        rowResizer.style.top = newTop + 'px';
        tableResizerTop = event.clientY;
      }

      function onMouseUp() {
        $(".ql-table-row-resizer-guide").css("display", "none");

        var scrollTop     = $(window).scrollTop(),
          elementOffset = $rowToResize.offset().top,
          distance      = (elementOffset - scrollTop);

        if(rowBottom) {
          if(!topEle || (topEle && topEle.tagName != "TR")) {
            // When resizing top row
            var newRowHeight = distance - tableResizerTop + $rowToResize.outerHeight() + 4;
            let changeDelta = mainEditor.formatLine(newSelection.index, newSelection.length, "height", newRowHeight + "px");
            mainEditor.setContents(mainEditor.getContents())
          }
          else {
            // +4 accounts for height of resizer
            var newRowHeight = tableResizerTop - distance + 4;
            let changeDelta = mainEditor.formatLine(newSelection.index, newSelection.length, "height", newRowHeight + "px");
            mainEditor.setContents(mainEditor.getContents())
            //$rowToResize.find("td").css("height", newRowHeight + "px");
          }
        }        

        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('mousemove', onMouseMove);
      }
  }

  var colResizer = document.querySelector(".ql-table-column-resizer");
  var nthChild = -1;
  colResizer.onmousedown = function(event) {
    event.preventDefault()

    var leftX = event.clientX - 9;
    var rightX = event.clientX + 9;

    var leftEle = document.elementFromPoint(leftX,event.y);
    var rightEle = document.elementFromPoint(rightX, event.y);
    
    while(  
      (leftEle && leftEle.tagName != "TD" && rightEle) ||
      (rightEle && rightEle.tagName != "TD" && leftEle) ||
      (leftEle && leftEle.tagName != "TD" && rightEle && rightEle.tagName != "TD") 
    ) {
      if(leftEle && leftEle.tagName != "TD") {
        leftEle = leftEle.parentElement;
      }
      if(rightEle && rightEle.tagName != "TD") {
        rightEle = rightEle.parentElement;
      }
    }

    let oldSelection = mainEditor.getSelection();
    let tableRef;
    let columnTDs = [];

    var caseNum = 0;
    if(leftEle && leftEle.tagName === "TD" && 
      rightEle && rightEle.tagName === "TD"
    ) {
      caseNum = 1;
      tableRef = leftEle.parentElement.parentElement;
      nthChild = $(rightEle).index();
      columnTDs = $(tableRef).find("td:nth-child(" + (nthChild+1) + ")").toArray();
      columnTDs = columnTDs.concat(
        $(tableRef).find("td:nth-child(" + (nthChild-1) + ")").toArray()
      );
    }
    else if(leftEle.tagName === "TD") {
      caseNum = 2;
      tableRef = leftEle.parentElement.parentElement;
      nthChild = $(leftEle).index();
      columnTDs = $(tableRef).find("td:nth-child(" + (nthChild+1) + ")").toArray();
    }
    else if(rightEle.tagName === "TD") {
      caseNum = 3;
      tableRef = rightEle.parentElement.parentElement;
      nthChild = $(rightEle).index();
      columnTDs = $(tableRef).find("td:nth-child(" + (nthChild+1) + ")");
    }
    else { return }

    $(".ql-table-column-resizer-guide").css("display", "block")

    let shiftX = event.clientX - colResizer.getBoundingClientRect().left;

    var tableResizerLeft = event.clientY;

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    function onMouseMove(event) {
      let newLeft = event.clientX - $(".centralContainer").offset().left - 75

      let leftEdge = qlEditorDiv.offsetTop;
      if(newLeft < leftEdge) {
        newLeft = leftEdge;
      }

      colResizer.style.left = newLeft + "px";
      tableResizerLeft = event.clientY;
    }

    function onMouseUp(event) {
      $(".ql-table-column-resizer-guide").css("display", "none");      
    
      if(rowTop) {
        var tableWidth = $(tableRef).outerWidth();
        
        switch(caseNum) {
          case 1:
            var diff = $(rightEle).offset().left - $(colResizer).offset().left;
            var pixelWidth = $(rightEle).outerWidth() + diff;
            var percentWidth = pixelWidth/tableWidth * 100;
            var diffPercent = ($(leftEle).outerWidth() - diff)/tableWidth * 100
            for(var i = columnTDs.length/2; i < columnTDs.length; i++) {
              var e = columnTDs[i];
              window.getSelection().selectAllChildren(e);
              var s = mainEditor.getSelection();
              
              mainEditor.formatLine(
                s.index, s.length, "width", diffPercent + "%"
              );
              window.getSelection().removeAllRanges();
            }
            for(var i = 0; i < columnTDs.length/2; i++) {
              var e = columnTDs[i];
              window.getSelection().selectAllChildren(e);
              var s = mainEditor.getSelection();
              
              mainEditor.formatLine(
                s.index, s.length, "width", percentWidth + "%"
              );
              window.getSelection().removeAllRanges();
            }
            mainEditor.setContents(mainEditor.getContents());
            break;
          case 2:
            /*var pixelWidth = $(colResizer).offset().left - $(leftEle).offset().left;
            var newTableWidth = $(tableRef).outerWidth() - pixelWidth;
            var percentWidth = pixelWidth/newTableWidth * 100;
            /*$(tableRef).css(
              "width", newTableWidth + "px"
            );
            columnTDs.forEach(function(e) {
              window.getSelection().selectAllChildren(e);
              var s = mainEditor.getSelection();
              mainEditor.formatLine(
                s.index, s.length, "width", percentWidth + "%"
              );
              window.getSelection().removeAllRanges();
            });
            debugger;
            mainEditor.setContents(mainEditor.getContents());*/
            break;
          case 3:
            break;
          default:
            break;
        }
      }

      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousemove', onMouseMove);
    }
  }
