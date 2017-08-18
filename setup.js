let maxRows = 10;
let maxCols = 5;
let tableOptions = [];
for (let r = 1; r <= maxRows; r++) {
  for (let c = 1; c <= maxCols; c++) {
    tableOptions.push('newtable_' + r + '_' + c);
  }
}

var toolbarMainOptions = [
  ['bold', 'italic', 'underline', 'strike'],        // toggled buttons

  [{ 'list': 'ordered'}, { 'list': 'bullet' }],

  [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown

  [{ 'color': [] }, { 'background': [] }],

  [ 'link'],

  [{ 'align': [] }],

  ['clean'],                                        // remove formatting button
  
  [{ 'table': tableOptions }], // new table (cursor needs to be out of table)
];

var bindings = {
  tableBackspace: {
    key: 8,
    // offset: 0,
    handler: function(range, context) {
      var formats = quill.getFormat(range.index-1, 1);
      if (formats.tdbr || formats.trbr) {
        // prevent deletion of table break
        return false;
      }
      return true;
    }
  },
  tableShiftTab: {
    key: 9,
    format: ["td", "tdbr", "trbr"],
    shiftKey: true,
    handler: function(range) {
      var formats = quill.getFormat(range.index-1, 1);
      var previousTD = getPreviousTDIndex(quill.getContents(0,range.index), range.index);
      quill.setSelection(previousTD, "silent");
    } 
  },
  tab: {
    key: 9,
    handler: function(range, context) {
      var formats = quill.getFormat(range.index-1, 1);
      var nextTD = getNextTDIndex(quill.getContents(range.index), range.index);
      if(formats.td || formats.tdbr || formats.trbr) {
        quill.setSelection(nextTD, 0);  
      }
      else {
        if (!context.collapsed) {
          quill.scroll.deleteAt(range.index, range.length);
        }
        quill.insertText(range.index, '\t', "user");
        quill.setSelection(range.index + 1, "silent");
      }
    }
  },
  tableEnter: {
    key: 13,
    handler: function(range, context) {
      console.log(quill.getContents())
      return true;
    }
  }
};

var quill = new Quill('#editor-container', {
  modules: {
    toolbar: {
      container: toolbarMainOptions,
      handlers: {
        table: function (value) {
          if(value && value.includes('newtable_')) {
            debugger;
            let sizes = value.split('_');
            let rows = Number.parseInt(sizes[1])
            let columns = Number.parseInt(sizes[2])
            let table = Parchment.create('table');
            const range = quill.getSelection()
            if (!range) return
            const newLineIndex = getClosestNewLineIndex(quill.getContents(), range.index + range.length)
            let changeDelta = new Delta().retain(newLineIndex)
            changeDelta = changeDelta.insert('\n')
            for (let i = 0; i < rows; i++) {
              for (let j = 0; j < columns; j++) {
                changeDelta = changeDelta.insert('\n', { 
                  td: true
                })
                if (j < columns - 1) {
                  changeDelta = changeDelta.insert({ tdbr: true })
                }
              }
              changeDelta = changeDelta.insert({ trbr: true })
            }
            quill.updateContents(changeDelta, Quill.sources.USER)
            quill.setSelection(newLineIndex + 1)       
          } else {
            // TODO
          }          
        },
       'table-insert-rows': function() {
          insertNewRow();
        },
        'table-insert-columns': function() {
          let td = find_td('td')
          if(td) {
            let table = td.parent.parent;
            td.parent.parent.children.forEach(function(tr) {
              let td = Parchment.create('td');
              tr.appendChild(td);
              tr.appendChild(Parchment.create('tdbr'))
            });
          }            
        }      
      }
    },
    clipboard: {
      matchers: [
        ['TD, TH', function (node, delta) {
          delta.insert("\n", { td: true })
          delta.insert({ tdbr: true })
          return delta
        }],
        ['TR', function (node, delta) {
          delta.insert({ trbr: true })
          return delta
        }],        
      ]
    },
    keyboard: {
      bindings: bindings
    }
  },
  theme: 'snow'
});

quill.on('text-change', function(delta, source) {
  document.getElementById("output_delta").value=JSON.stringify(quill.editor.getDelta(), null, 2)
  document.getElementById("output_html").value=quill.root.innerHTML;
  document.getElementById("view_html").innerHTML=quill.root.innerHTML;      
})

// use sample delta
var delta = getSampleDelta()
document.getElementById("orig_delta").value=JSON.stringify(delta, null, 2)
quill.setContents(delta);

function getNextTDIndex(contents, index) {
  var joinedText = contents.map(function(op) {
    return typeof op.insert === 'string' ? op.insert : ' '
  }).join('');

  /**
   * Breaking at first case of tdbr/trbr places the cursor
   * at the beginning of the table cell, but from a UX point
   * of view we want it to jump to the end. So we want the 
   * text preceeding the second tdbr/trbr
   */
  var breakCount = 0; 
  for(var i = 0; i < joinedText.length; i++) {
    var format = quill.getFormat(index + i);
    if(format.tdbr || format.trbr) {
      breakCount++;
    }
    if(breakCount === 2) {
      return index + i - 1;
    }
    if(!(format.tdbr || format.trbr || format.td)) {
      // Add row when in last table cell
      insertNewRow(
        {
          index: index,
          length: 0
        }
      );
      return index + i;
    }
  }
};

function getPreviousTDIndex(contents, index) {
  var joinedText = contents.map(function(op) {
    return typeof op.insert === 'string' ? op.insert : ' '
  }).join('');
  for(var i = joinedText.length - 1; i >= 0; i--) {
    var format = quill.getFormat(i);
    if(format.tdbr || format.trbr) {
      // Go To previous table cell
      return i - 1;
    }
    if(!format.td) {
      // Go to front of table if shift+tab pressed in first cell
      return i + 1;
    }
  }
};

function getClosestNewLineIndex (contents, index) {
  return index + contents.map(function(op) {
    return typeof op.insert === 'string' ? op.insert : ' '
  }).join('')
    .slice(index)
    .indexOf('\n')
}

function insertNewRow(range) {
  let td = find_td('td')
  if(td) {
    let columns = 0
    td.parent.children.forEach(function (child) {
      if (child instanceof TableCell) {
        columns++;
      } 
    })

    // range.index + 1 is to avoid the current index having a \n
    const newLineIndex = getClosestNewLineIndex(quill.getContents(), range.index + 1);
    let changeDelta = new Delta().retain(newLineIndex);
    for (let j = 0; j < columns; j++) {
      changeDelta = changeDelta.insert('\n', { 
        td: true
      })
      if (j < columns - 1) {
        changeDelta = changeDelta.insert({ tdbr: true });
      }
    }
    changeDelta = changeDelta.insert({ trbr: true });
    quill.updateContents(changeDelta, Quill.sources.USER);
  }                            
}

function find_td(what) {
    let leaf = quill.getLeaf(quill.getSelection()['index']);
    let blot = leaf[0];
    for(;blot!=null && blot.statics.blotName!=what;) {
      blot=blot.parent;
    }
    return blot; // return TD or NULL
}

function getSampleDelta () {
  return {
  "ops": [
    {
      "insert": "Test Tables"
    },
    {
      "insert": "\n",
      "attributes": {
        "header": 1
      }
    },
    {
      "insert": "Empty 3x3 table from toolbar"
    },
    {
      "insert": "\n",
      "attributes": {
        "header": 2
      }
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "trbr": true
      },
      "attributes": {
        "trbr": true
      }
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "trbr": true
      },
      "attributes": {
        "trbr": true
      }
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "trbr": true
      },
      "attributes": {
        "trbr": true
      }
    },
    {
      "insert": "\nPopulated 3x3 table (from toolbar)"
    },
    {
      "insert": "\n",
      "attributes": {
        "header": 2
      }
    },
    {
      "insert": "Col 1"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": "Col 2"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": "Col 3"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "trbr": true
      },
      "attributes": {
        "trbr": true
      }
    },
    {
      "insert": "a"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": "b"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": "c"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": "1"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD",
        "list": "bullet"
      }
    },
    {
      "insert": "2"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD",
        "list": "bullet",
        "indent": 1
      }
    },
    {
      "insert": "3"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD",
        "list": "bullet",
        "indent": 2
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": "456"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "trbr": true
      },
      "attributes": {
        "trbr": true
      }
    },
    {
      "insert": "d"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": "4"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": "7"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "trbr": true
      },
      "attributes": {
        "trbr": true
      }
    },
    {
      "insert": "\nPasted Table"
    },
    {
      "insert": "\n",
      "attributes": {
        "header": 2
      }
    },
    {
      "insert": "Company"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": "Contact"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": "Country"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": {
        "trbr": true
      },
      "attributes": {
        "trbr": true
      }
    },
    {
      "insert": "Alfreds Futterkiste"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": "Maria Anders"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": "Germany"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": {
        "trbr": true
      },
      "attributes": {
        "trbr": true
      }
    },
    {
      "insert": "Centro comercial Moctezuma"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": "Francisco Chang"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": "Mexico"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": {
        "trbr": true
      },
      "attributes": {
        "trbr": true
      }
    },
    {
      "insert": "Ernst Handel"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": "Roland Mendel"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": "Austria"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": {
        "trbr": true
      },
      "attributes": {
        "trbr": true
      }
    },
    {
      "insert": "Island Trading"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": "Helen Bennett"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": "UK"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": {
        "trbr": true
      },
      "attributes": {
        "trbr": true
      }
    },
    {
      "insert": "Laughing Bacchus Winecellars"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": "Yoshi Tannamuri"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": "Canada"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": {
        "trbr": true
      },
      "attributes": {
        "trbr": true
      }
    },
    {
      "insert": "Magazzini Alimentari Riuniti"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": "Giovanni Rovelli"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": "Italy"
    },
    {
      "insert": "\n",
      "attributes": {
        "td": "TD"
      }
    },
    {
      "insert": {
        "tdbr": true
      },
      "attributes": {
        "tdbr": true
      }
    },
    {
      "insert": {
        "trbr": true
      },
      "attributes": {
        "trbr": true
      }
    },
    {
      "insert": "\n"
    }
  ]
}
}