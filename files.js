window.onload = function() {
  var config = document.getElementById("filesapp");

  loadJSON(config.dataset.api,
    function(data) {
      var dataTable = ConvertJsonToTable(data, 'dataTable', null, 'Download');
      config.innerHTML = dataTable;
      new Tablesort(document.getElementById("dataTable"));
    },
    function(err) { console.error(err); })
}

function loadJSON(path, success, error)
{
    var request = new XMLHttpRequest();
    request.onreadystatechange = function()
    {
        if (request.readyState === XMLHttpRequest.DONE) {
          if (request.status >= 200 && request.status < 400) {
                if (success)
                    success(JSON.parse(request.responseText));
            } else {
                if (error)
                    error(request);
            }
        }
    };
    request.open("GET", path, true);
    request.send();
}

// From: https://github.com/afshinm/Json-to-HTML-Table

/**
 * JavaScript format string function
 *
 */
String.prototype.format = function()
{
  var args = arguments;

  return this.replace(/{(\d+)}/g, function(match, number)
  {
    return typeof args[number] != 'undefined' ? args[number] :
                                                '{' + number + '}';
  });
};


/**
 * Convert a Javascript Oject array or String array to an HTML table
 * JSON parsing has to be made before function call
 * It allows use of other JSON parsing methods like jQuery.parseJSON
 * http(s)://, ftp://, file:// and javascript:; links are automatically computed
 *
 * JSON data samples that should be parsed and then can be converted to an HTML table
 *     var objectArray = '[{"Total":"34","Version":"1.0.4","Office":"New York"},{"Total":"67","Version":"1.1.0","Office":"Paris"}]';
 *     var stringArray = '["New York","Berlin","Paris","Marrakech","Moscow"]';
 *     var nestedTable = '[{ key1: "val1", key2: "val2", key3: { tableId: "tblIdNested1", tableClassName: "clsNested", linkText: "Download", data: [{ subkey1: "subval1", subkey2: "subval2", subkey3: "subval3" }] } }]';
 *
 * Code sample to create a HTML table Javascript String
 *     var jsonHtmlTable = ConvertJsonToTable(eval(dataString), 'jsonTable', null, 'Download');
 *
 * Code sample explaned
 *  - eval is used to parse a JSON dataString
 *  - table HTML id attribute will be 'jsonTable'
 *  - table HTML class attribute will not be added
 *  - 'Download' text will be displayed instead of the link itself
 *
 * @author Afshin Mehrabani <afshin dot meh at gmail dot com>
 *
 * @class ConvertJsonToTable
 *
 * @method ConvertJsonToTable
 *
 * @param parsedJson object Parsed JSON data
 * @param tableId string Optional table id
 * @param tableClassName string Optional table css class name
 * @param linkText string Optional text replacement for link pattern
 *
 * @return string Converted JSON to HTML table
 */
function ConvertJsonToTable(parsedJson, tableId, tableClassName, linkText)
{
    //Patterns for links and NULL value
    var italic = '<i>{0}</i>';
    var link = linkText ? '<a href="{0}">' + linkText + '</a>' :
                          '<a href="{0}">{0}</a>';

    //Pattern for table
    var idMarkup = tableId ? ' id="' + tableId + '"' :
                             '';

    var classMarkup = tableClassName ? ' class="' + tableClassName + '"' :
                                       '';

    var tbl = '<table border="1" cellpadding="1" cellspacing="1"' + idMarkup + classMarkup + '>{0}{1}</table>';

    //Patterns for table content
    var th = '<thead>{0}</thead>';
    var tb = '<tbody>{0}</tbody>';
    var tr = '<tr>{0}</tr>';
    var thRow = '<th>{0}</th>';
    var tdRow = '<td>{0}</td>';
    var thCon = '';
    var tbCon = '';
    var trCon = '';

    if (parsedJson)
    {
        var isStringArray = typeof(parsedJson[0]) == 'string';
        var headers;

        // Create table headers from JSON data
        // If JSON data is a simple string array we create a single table header
        if(isStringArray)
            thCon += thRow.format('value');
        else
        {
            // If JSON data is an object array, headers are automatically computed
            if(typeof(parsedJson[0]) == 'object')
            {
                headers = array_keys(parsedJson[0]);

                for (i = 0; i < headers.length; i++)
                    thCon += thRow.format(headers[i]);
            }
        }
        th = th.format(tr.format(thCon));

        // Create table rows from Json data
        if(isStringArray)
        {
            for (i = 0; i < parsedJson.length; i++)
            {
                tbCon += tdRow.format(parsedJson[i]);
                trCon += tr.format(tbCon);
                tbCon = '';
            }
        }
        else
        {
            if(headers)
            {
                var urlRegExp = new RegExp(/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig);
                var javascriptRegExp = new RegExp(/(^javascript:[\s\S]*;$)/ig);

                for (i = 0; i < parsedJson.length; i++)
                {
                    for (j = 0; j < headers.length; j++)
                    {
                        var value = parsedJson[i][headers[j]];
                        var isUrl = urlRegExp.test(value) || javascriptRegExp.test(value);

                        if(isUrl)   // If value is URL we auto-create a link
                            tbCon += tdRow.format(link.format(value));
                        else
                        {
                            if(value){
                            	if(typeof(value) == 'object'){
                            		//for supporting nested tables
                            		tbCon += tdRow.format(ConvertJsonToTable(eval(value.data), value.tableId, value.tableClassName, value.linkText));
                            	} else {
                            		tbCon += tdRow.format(value);
                            	}

                            } else {    // If value == null we format it like PhpMyAdmin NULL values
                                tbCon += tdRow.format(italic.format(value).toUpperCase());
                            }
                        }
                    }
                    trCon += tr.format(tbCon);
                    tbCon = '';
                }
            }
        }
        tb = tb.format(trCon);
        tbl = tbl.format(th, tb);

        return tbl;
    }
    return null;
}


/**
 * Return just the keys from the input array, optionally only for the specified search_value
 * version: 1109.2015
 *  discuss at: http://phpjs.org/functions/array_keys
 *  +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
 *  +      input by: Brett Zamir (http://brett-zamir.me)
 *  +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
 *  +   improved by: jd
 *  +   improved by: Brett Zamir (http://brett-zamir.me)
 *  +   input by: P
 *  +   bugfixed by: Brett Zamir (http://brett-zamir.me)
 *  *     example 1: array_keys( {firstname: 'Kevin', surname: 'van Zonneveld'} );
 *  *     returns 1: {0: 'firstname', 1: 'surname'}
 */
function array_keys(input, search_value, argStrict)
{
    var search = typeof search_value !== 'undefined', tmp_arr = [], strict = !!argStrict, include = true, key = '';

    if (input && typeof input === 'object' && input.change_key_case) { // Duck-type check for our own array()-created PHPJS_Array
        return input.keys(search_value, argStrict);
    }

    for (key in input)
    {
        if (input.hasOwnProperty(key))
        {
            include = true;
            if (search)
            {
                if (strict && input[key] !== search_value)
                    include = false;
                else if (input[key] != search_value)
                    include = false;
            }
            if (include)
                tmp_arr[tmp_arr.length] = key;
        }
    }
    return tmp_arr;
}



/*!
 * tablesort v3.0.2 (2015-02-25)
 * http://tristen.ca/tablesort/demo/
 * Copyright (c) 2015 ; Licensed MIT
*/!function(){function a(a,b){if(!a||"TABLE"!==a.tagName)throw new Error("Element must be a table");this.init(a,b||{})}var b=[],c=function(a){var b;return window.CustomEvent&&"function"==typeof window.CustomEvent?b=new CustomEvent(a):(b=document.createEvent("CustomEvent"),b.initCustomEvent(a,!1,!1,void 0)),b},d=function(a){return a.getAttribute("data-sort")||a.textContent||a.innerText||""},e=function(a,b){return a=a.toLowerCase(),b=b.toLowerCase(),a===b?0:b>a?1:-1},f=function(a,b){return function(c,d){var e=a(c.td,d.td);return 0===e?b?d.index-c.index:c.index-d.index:e}};a.extend=function(a,c,d){if("function"!=typeof c||"function"!=typeof d)throw new Error("Pattern and sort must be a function");b.push({name:a,pattern:c,sort:d})},a.prototype={init:function(a,b){var c,d,e,f,g=this;if(g.table=a,g.thead=!1,g.options=b,a.rows&&a.rows.length>0&&(a.tHead&&a.tHead.rows.length>0?(c=a.tHead.rows[a.tHead.rows.length-1],g.thead=!0):c=a.rows[0]),c){var h=function(){g.current&&g.current!==this&&(g.current.classList.remove("sort-up"),g.current.classList.remove("sort-down")),g.current=this,g.sortTable(this)};for(e=0;e<c.cells.length;e++)f=c.cells[e],f.classList.contains("no-sort")||(f.classList.add("sort-header"),f.addEventListener("click",h,!1),f.classList.contains("sort-default")&&(d=f));d&&(g.current=d,g.sortTable(d))}},sortTable:function(a,g){var h=this,i=a.cellIndex,j=e,k="",l=[],m=h.thead?0:1,n=a.getAttribute("data-sort-method");if(h.table.dispatchEvent(c("beforeSort")),!(h.table.rows.length<2)){if(!n){for(;l.length<3&&m<h.table.tBodies[0].rows.length;)k=d(h.table.tBodies[0].rows[m].cells[i]),k=k.trim(),k.length>0&&l.push(k),m++;if(!l)return}for(m=0;m<b.length;m++)if(k=b[m],n){if(k.name===n){j=k.sort;break}}else if(l.every(k.pattern)){j=k.sort;break}h.col=i;var o,p,q=[],r={},s=0,t=0;for(m=0;m<h.table.tBodies.length;m++)for(o=0;o<h.table.tBodies[m].rows.length;o++)k=h.table.tBodies[m].rows[o],k.classList.contains("no-sort")?r[s]=k:q.push({tr:k,td:d(k.cells[h.col]),index:s}),s++;for(g?p=a.classList.contains("sort-up")?"sort-up":"sort-down":(p=a.classList.contains("sort-up")?"sort-down":a.classList.contains("sort-down")?"sort-up":h.options.descending?"sort-up":"sort-down",a.classList.remove("sort-down"===p?"sort-up":"sort-down"),a.classList.add(p)),"sort-down"===p?(q.sort(f(j,!0)),q.reverse()):q.sort(f(j,!1)),m=0;s>m;m++)r[m]?(k=r[m],t++):k=q[m-t].tr,h.table.tBodies[0].appendChild(k);h.table.dispatchEvent(c("afterSort"))}},refresh:function(){void 0!==this.current&&this.sortTable(this.current,!0)}},"undefined"!=typeof module&&module.exports?module.exports=a:window.Tablesort=a}();



// Basic dates in dd/mm/yy or dd-mm-yy format.
// Years can be 4 digits. Days and Months can be 1 or 2 digits.
(function(){
  var parseDate = function(date) {
    date = date.replace(/\-/g, '/');
    date = date.replace(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})/, '$1/$2/$3'); // format before getTime

    return new Date(date).getTime() || -1;
  };

  Tablesort.extend('date', function(item) {
    return (
      item.search(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\.?\,?\s*/i) !== -1 ||
      item.search(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/) !== -1 ||
      item.search(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i) !== -1
    ) && !isNaN(parseDate(item));
  }, function(a, b) {
    a = a.toLowerCase();
    b = b.toLowerCase();

    return parseDate(b) - parseDate(a);
  });
}());

// Filesizes. e.g. '5.35 K', '10 MB', '12.45 GB', or '4.67 TiB'
(function(){
  var compareNumber = function(a, b) {
    a = parseFloat(a);
    b = parseFloat(b);

    a = isNaN(a) ? 0 : a;
    b = isNaN(b) ? 0 : b;

    return a - b;
  },

  cleanNumber = function(i) {
    return i.replace(/[^\-?0-9.]/g, '');
  },

  // Converts filesize to bytes
  // Ex. filesize2num('123 KB') -> 123000
  // Ex. filesize2num('123 KiB') -> 125952
  filesize2num = function(filesize) {
    var matches = filesize.match(/^(\d+(\.\d+)?) ?((K|M|G|T|P|E|Z|Y|B$)i?B?)$/i);

    var num    = parseFloat(cleanNumber(matches[1])),
      suffix = matches[3];

    return num * suffix2num(suffix);
  },

  // Returns suffix multiplier
  // Ex. suffix2num('KB') -> 1000
  // Ex. suffix2num('KiB') -> 1024
  suffix2num = function(suffix) {
    suffix = suffix.toLowerCase();
    var base = suffix[1] === 'i' ? 1024 : 1000;

    switch(suffix[0]) {
      case 'k':
        return Math.pow(base, 2);
      case 'm':
        return Math.pow(base, 3);
      case 'g':
        return Math.pow(base, 4);
      case 't':
        return Math.pow(base, 5);
      case 'p':
        return Math.pow(base, 6);
      case 'e':
        return Math.pow(base, 7);
      case 'z':
        return Math.pow(base, 8);
      case 'y':
        return Math.pow(base, 9);
      default:
        return base;
    }
  };

  Tablesort.extend('filesize', function(item) {
    return /^\d+(\.\d+)? ?(K|M|G|T|P|E|Z|Y|B$)i?B?$/i.test(item);
  }, function(a, b) {
    a = filesize2num(a);
    b = filesize2num(b);

    return compareNumber(b, a);
  });
}());

(function(){
  var cleanNumber = function(i) {
    return i.replace(/[^\-?0-9.]/g, '');
  },

  compareNumber = function(a, b) {
    a = parseFloat(a);
    b = parseFloat(b);

    a = isNaN(a) ? 0 : a;
    b = isNaN(b) ? 0 : b;

    return a - b;
  };

  Tablesort.extend('number', function(item) {
    return item.match(/^-?[£\x24Û¢´€]?\d+\s*([,\.]\d{0,2})/) || // Prefixed currency
      item.match(/^-?\d+\s*([,\.]\d{0,2})?[£\x24Û¢´€]/) || // Suffixed currency
      item.match(/^-?(\d)*-?([,\.]){0,1}-?(\d)+([E,e][\-+][\d]+)?%?$/); // Number
  }, function(a, b) {
    a = cleanNumber(a);
    b = cleanNumber(b);

    return compareNumber(b, a);
  });
}());

// Dot separated values. E.g. IP addresses or version numbers.
Tablesort.extend('dotsep', function(item) {
  return /^(\d+\.)+\d+$/.test(item);
}, function(a, b) {
  a = a.split('.');
  b = b.split('.');

  for (var i = 0, len = a.length, ai, bi; i < len; i++) {
    ai = parseInt(a[i], 10);
    bi = parseInt(b[i], 10);

    if (ai === bi) continue;
    if (ai > bi) return -1;
    if (ai < bi) return 1;
  }

  return 0;
});
