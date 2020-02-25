# Autocomplete Adapter
Adapter for easy input auto-completion with various sources

```js
{
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
        "country"
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
}
```

### Todo
- npm
- consider nested JSON data
