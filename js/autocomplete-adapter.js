/**
 * Autocomplete Adapter
 *
 * @author Daniele Sciannimanica <https://github.com/doishub>
 * @version 0.0.3
 */
var AutocompleteAdapter = (function () {

    'use strict';

    var Constructor = function (selector, settings) {
        var p = {};
        var autocomplete = {};
        var sourceLoader = null;

        var defaults = {
            sourceUrl: '/path/to/json',         // {String|null} Path to source (JSON)
            sourceParameter: null,              // {Object|null} Language to search
            sourceLoaderAsync: true,            // {Boolean}     Load source asynchronous
            minCharacters: 3,                   // {Number}      Min character length
            maxItems: 10,                       // {Number}      Max number if items
            titleAttribute: 'title',            // {String}      Attribute name to be filled into the search input after selecting an item
            formFieldPrefix: 'region_',         // {String}      Prefix for dynamic created form fields
            formFieldRestore: true,             // {Boolean}     Restore field values
            formFields: [                       // {Array|null}  Hidden form fields, which are created and will be filled out after selecting an item
                "id",
                "country",
                "latitude",
                "longitude",
            ],
            itemFields: [                       // {Array|null}  Attributes that are output for each element
                "title",
                "country"
            ],
            onInit: null,                       // {Function|null} (autocomplete)            Callback on init
            onSearch: null,                     // {Function|null} (param, autocomplete)     Disable the default search function.
            onSearchSuccess: null,              // {Function|null} (results, autocomplete)   Callback if search succeed
            onSearchError: null,                // {Function|null} (autocomplete)            Callback in case of faulty search
            onSearchAbort: null,                // {Function|null} (autocomplete)            Callback in case of abort search
            onSearchBoxEvent: null,             // {Function|null} (mode, autocomplete)      Callback to handle search box behavior
            onItemSelect: null                  // {Function|null} (autocomplete)            Callback if an itemSelected
        };


        /**
         * Initialize Autocomplete
         */
        var init = function () {
            autocomplete.settings = extend(true, defaults, settings);
            autocomplete.input = document.getElementById(selector);
            autocomplete.formFields = {};
            autocomplete.results = [];
            autocomplete.allowSubmit = false;

            if(autocomplete.input === null){
                console.error('AutocompleteAdapter: Could not find selector', selector);
                return;
            }

            // create search box
            createLoader();

            // create search box
            createSearchBox();

            // call custom function
            callback(autocomplete.settings.onInit, {autocomplete: autocomplete});
        };

        /**
         * Create SearchBox
         */
        var createSearchBox = function(){
            // create search box
            autocomplete.searchBox = document.createElement('div');
            autocomplete.searchBox.classList.add('autocomplete-search');

            // create hidden input fields
            for (var id in autocomplete.settings.formFields)
            {
                var value = storage(autocomplete.settings.formFields[id]);
                var field = document.createElement('input');
                field.setAttribute('type', 'hidden');
                field.setAttribute('name', autocomplete.settings.formFieldPrefix + autocomplete.settings.formFields[id]);

                if(value){
                    field.value = value;
                }

                autocomplete.input.parentNode.appendChild(field);
                autocomplete.formFields[ autocomplete.settings.formFields[id] ] = field;
            }

            autocomplete.input.parentNode.appendChild(autocomplete.searchBox);
            autocomplete.input.setAttribute('autocomplete', 'off');

            // bind events
            autocomplete.input.addEventListener('keyup', onSearch);
            autocomplete.input.addEventListener('keydown', validate);
            autocomplete.input.addEventListener('focus', function(e){ searchbox('showOnFocus') });

            // close the search box on document click
            document.addEventListener('click', function(e){
                if (!getClosest(e.target, '#'  + autocomplete.input.id) && !getClosest(e.target, '.' + autocomplete.searchBox.className)){
                    searchbox('hide');
                }
            });

            // close the search box on default
            searchbox('hide');
        };

        /**
         * Create Loader
         */
        var createLoader = function() {
            // create search box
            autocomplete.loader = document.createElement('div');
            autocomplete.loader.classList.add('autocomplete-loader');
            autocomplete.input.parentNode.appendChild(autocomplete.loader);

            loader('hide');
        };

        /**
         * Build a single item
         *
         * @param {Object} data
         */
        var createItem = function(data){
            var item = document.createElement('div');
            item.classList.add('autocomplete-item');
            item.addEventListener('click', function(e){
                selectItem(data);
            });

            for(var ind in autocomplete.settings.itemFields){
                if(data.hasOwnProperty( autocomplete.settings.itemFields[ind] )){
                    var cont = document.createElement('span');
                    cont.classList.add(autocomplete.settings.itemFields[ind]);
                    cont.innerHTML = data[ autocomplete.settings.itemFields[ind] ];

                    item.appendChild(cont);
                }
            }

            autocomplete.searchBox.appendChild(item);
            autocomplete.results.push([item, data]);
        };

        /**
         * On select an item
         *
         * @param {Object} data
         */
        var selectItem = function(data){
            // fill hidden form fields
            for (var name in autocomplete.formFields)
            {
                if(data.hasOwnProperty(name)){
                    autocomplete.formFields[ name ].value = data[ name ];
                }else{
                    autocomplete.formFields[ name ].value = '';
                }

                storage(name, autocomplete.formFields[ name ].value);
            }

            // fill input field
            if(data.hasOwnProperty(autocomplete.settings.titleAttribute))
            {
                autocomplete.input.value = data[ autocomplete.settings.titleAttribute ];
            }

            // dispatch change event
            autocomplete.input.dispatchEvent(new Event('change'));

            // close search box
            searchbox('hide');

            // call custom function
            callback(autocomplete.settings.onItemSelect, {autocomplete: autocomplete});
        };

        /**
         * On search
         *
         * @param {Event} e
         */
        var onSearch = function(e){
            autocomplete.allowSubmit = false;

            var val = autocomplete.input.value.trim();

            // disallow arrow keys, home, end, pageUp and pageDown
            if ([37, 38, 39, 40, 36, 35, 33, 34].indexOf(e.keyCode) > -1) {
                return;
            }

            if(sourceLoader !== null)
            {
                sourceLoader.abort();

                // call custom function
                callback(autocomplete.settings.onSearchAbort, {xhr: sourceLoader, autocomplete: autocomplete});
            }

            if(val && val.length >= autocomplete.settings.minCharacters){
                doSearch(extend(true, autocomplete.settings.sourceParameter || {}, {search: val}));
            }else{
                // clear and close the search box
                searchbox('clear');
            }
        };

        /**
         * Do search
         *
         * @param {Object} param
         */
        var doSearch = function(param){
            // if onSearch callback available, use this instead of this function
            if(callback(autocomplete.settings.onSearch, {param: param, autocomplete: autocomplete})){
                return;
            }

            // show loader
            loader('show');

            // merge parameter with source url
            var url = autocomplete.settings.sourceUrl;

            if(typeof param === 'object'){
                url += '?' + serialize(param);
            }

            // load source by xhr request
            sourceLoader = new XMLHttpRequest();
            sourceLoader.open('GET', url, autocomplete.settings.sourceLoaderAsync);
            sourceLoader.onload = function() {
                if (sourceLoader.status >= 200 && sourceLoader.status < 400) {
                    var results = JSON.parse(sourceLoader.responseText);

                    // clear and hide search box
                    searchbox('clear');

                    // hide loader
                    loader('hide');

                    // create items from response
                    if(results.error.status < 1 && results.data) {
                        var i = 0;
                        for (var id in results.data) {
                            createItem(results.data[id]);

                            if(i++ >= autocomplete.settings.maxItems){
                                break;
                            }
                        }

                        // show search box
                        searchbox('show');
                    }

                    // reset source loader
                    sourceLoader = null;

                    // call custom function
                    callback(autocomplete.settings.onSearchSuccess, {results: results, autocomplete: autocomplete});
                }
            };

            sourceLoader.onerror = function() {
                // clear and close search box
                searchbox('clear');

                // call custom function
                callback(autocomplete.settings.onSearchError, {autocomplete: autocomplete});
            };

            sourceLoader.send();
        };

        /**
         * Validate results and behavior
         *
         * @param {Event} e
         *
         * @returns {boolean}
         */
        var validate = function(e) {
            // validate before send form
            autocomplete.input.form.addEventListener('submit', preventFormSubmit, false);

            if ([13, 9].indexOf(e.keyCode) > -1 && !autocomplete.allowSubmit && autocomplete.results.length >= 1) {
                selectItem(autocomplete.results[0][1]);
                autocomplete.allowSubmit = true;
            }

            autocomplete.input.form.removeEventListener('submit', preventFormSubmit);

            if(e.keyCode === 13 && autocomplete.allowSubmit){
                autocomplete.input.form.submit();
            }
        };

        /**
         * Prevent form submit
         *
         * @returns {boolean}
         */
        var preventFormSubmit = function(){
            return false;
        };

        /**
         * SearchBox helper function
         *
         * @param {String} mode
         */
        var searchbox = function(mode){
            switch (mode) {
                // clear and close the search box
                case 'clear':
                    autocomplete.results = [];
                    autocomplete.searchBox.innerHTML = '';

                    for (var name in autocomplete.formFields) {
                        autocomplete.formFields[ name ].value='';
                    }

                // close search box
                case 'hide':
                    autocomplete.searchBox.style.display='none';
                    break;

                // opens the search box only with results
                case 'showOnFocus':
                    if(!autocomplete.results.length)
                        break;

                // open the search box
                case 'show':
                    autocomplete.searchBox.style.display='block';
                    break;
            }

            // call custom function
            callback(autocomplete.settings.onSearchBoxEvent, {mode: mode, autocomplete: autocomplete});
        };

        /**
         * Loader helper function
         *
         * @param {String} mode
         */
        var loader = function(mode){
            switch (mode) {
                // hide the loader
                case 'hide':
                    autocomplete.loader.style.display='none';
                    break;
                // show the loader
                case 'show':
                    autocomplete.loader.style.display='block';
                    break;
            }
        };

        /* Helper methods */
        var storage = function(variable, value){
            if(autocomplete.settings.formFieldRestore && typeof value !== 'undefined'){
                return sessionStorage.setItem(variable, value);
            }else if(autocomplete.settings.formFieldRestore){
                return sessionStorage.getItem(variable);
            }

            return null;
        };

        var callback = function(func, param){
            if(typeof func === 'function') {
                func.call(this, param);
                return true;
            }

            return false;
        };

        var getClosest = function (elem, selector) {

            // Variables
            var firstChar = selector.charAt(0);
            var supports = 'classList' in document.documentElement;
            var attribute, value;

            // If selector is a data attribute, split attribute from value
            if ( firstChar === '[' ) {
                selector = selector.substr(1, selector.length - 2);
                attribute = selector.split( '=' );

                if ( attribute.length > 1 ) {
                    value = true;
                    attribute[1] = attribute[1].replace( /"/g, '' ).replace( /'/g, '' );
                }
            }

            // Get closest match
            for ( ; elem && elem !== document; elem = elem.parentNode ) {

                // If selector is a class
                if ( firstChar === '.' ) {
                    if ( supports ) {
                        if ( elem.classList.contains( selector.substr(1) ) ) {
                            return elem;
                        }
                    } else {
                        if ( new RegExp('(^|\\s)' + selector.substr(1) + '(\\s|$)').test( elem.className ) ) {
                            return elem;
                        }
                    }
                }

                // If selector is an ID
                if ( firstChar === '#' ) {
                    if ( elem.id === selector.substr(1) ) {
                        return elem;
                    }
                }

                // If selector is a data attribute
                if ( firstChar === '[' ) {
                    if ( elem.hasAttribute( attribute[0] ) ) {
                        if ( value ) {
                            if ( elem.getAttribute( attribute[0] ) === attribute[1] ) {
                                return elem;
                            }
                        } else {
                            return elem;
                        }
                    }
                }

                // If selector is a tag
                if ( elem.tagName.toLowerCase() === selector ) {
                    return elem;
                }

            }

            return null;

        };

        var serialize = function (obj, prefix) {
            var str = [],
                p;
            for (p in obj) {
                if (obj.hasOwnProperty(p)) {
                    var k = prefix ? prefix + "[" + p + "]" : p,
                        v = obj[p];
                    str.push((v !== null && typeof v === "object") ?
                        serialize(v, k) :
                        encodeURIComponent(k) + "=" + encodeURIComponent(v));
                }
            }
            return str.join("&");
        };

        var extend = function () {
            // Variables
            var extended = {};
            var deep = false;
            var i = 0;
            var length = arguments.length;

            // Check if a deep merge
            if ( Object.prototype.toString.call( arguments[0] ) === '[object Boolean]' ) {
                deep = arguments[0];
                i++;
            }

            // Merge the object into the extended object
            var merge = function (obj) {
                for ( var prop in obj ) {
                    if ( Object.prototype.hasOwnProperty.call( obj, prop ) ) {
                        // If deep merge and property is an object, merge properties
                        if ( deep && Object.prototype.toString.call(obj[prop]) === '[object Object]' ) {
                            extended[prop] = extend( true, extended[prop], obj[prop] );
                        } else {
                            extended[prop] = obj[prop];
                        }
                    }
                }
            };

            // Loop through each object and conduct a merge
            for ( ; i < length; i++ ) {
                var obj = arguments[i];
                merge(obj);
            }

            return extended;
        };

        //
        // Public methods
        //

        /**
         * Return the autocomplete object
         *
         * @returns {{}}
         */
        p.getAutocomplete = function(){
            return autocomplete;
        };

        /**
         * Control the SearchBox behavior
         *
         * @param {String} mode: clear, hide, show, showOnFocus
         */
        p.searchbox = function(mode){
            searchbox(mode);
        };

        /**
         * Control the Loader behavior
         *
         * @param {String} mode: hide, show
         */
        p.loader = function(mode){
            loader(mode);
        };

        /**
         * Control the SearchBox behavior
         *
         * @param {{}} data
         */
        p.createItem = function(data){
            createItem(data);
        };

        init();

        return p;
    };

    return Constructor;
})();
