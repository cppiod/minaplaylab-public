(function () {
  'use strict';
  var cache = new Map();
  function el(tag, text, className) {
    var node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function link(text, url) {
    var a = el('a', text);
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    return a;
  }
  function safeUrl(url) {
    try { return new URL(url).protocol === 'https:'; } catch (_) { return false; }
  }
  function videos(query) {
    return 'https://www.youtube.com/results?search_query=' + encodeURIComponent(query);
  }
  async function lookup(word) {
    var key = word.toLowerCase().trim();
    if (cache.has(key)) return cache.get(key);
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 10000);
    try {
      var response = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(key), { signal: controller.signal });
      if (!response.ok) throw new Error('Dictionary unavailable');
      var entries = await response.json();
      if (!Array.isArray(entries) || !entries.length) throw new Error('No entry');
      cache.set(key, entries);
      return entries;
    } finally { clearTimeout(timer); }
  }
  function worksheetExample(word) {
    var rows = (window.WordQuestWorksheets || {}).sentences || [];
    var row = rows.find(function (s) { return s[0].toLowerCase() === word.toLowerCase(); });
    return row ? row[2].replace('___', row[1]) : null;
  }
  function sources(parent, entry) {
    var p = el('p', 'Dictionary data: Free Dictionary API', 'learn-source');
    (entry.sourceUrls || []).filter(safeUrl).forEach(function (url) {
      p.append(' · ', link('Original dictionary entry', url));
    });
    if (entry.license && safeUrl(entry.license.url)) p.append(' · ', link(entry.license.name || 'License', entry.license.url));
    parent.append(p);
  }
  function renderWord(item, root, panel) {
    var heading = el('h3', item.word, 'learn-heading');
    heading.id = 'selectedWord';
    var phonetics = el('div', '', 'learn-phonetics');
    phonetics.hidden = true;
    var result = el('div');
    result.setAttribute('aria-live', 'polite');
    panel.replaceChildren(heading, phonetics);
    if (item.definition) panel.append(el('p', item.definition, 'learn-definition'));
    var example = worksheetExample(item.word);
    if (example) panel.append(el('blockquote', example), el('p', 'Example from your worksheet', 'learn-source'));
    panel.append(result);

    var links = el('div', '', 'learn-links');
    links.append(
      link('Merriam-Webster ↗', 'https://www.merriam-webster.com/dictionary/' + encodeURIComponent(item.word)),
      link('Cambridge ↗', 'https://dictionary.cambridge.org/dictionary/english/' + encodeURIComponent(item.word)),
      link('Find word videos ↗', videos(item.word + ' meaning pronunciation examples English vocabulary'))
    );
    var watch = el('section', '', 'learn-video');
    watch.append(
      el('h4', 'Videos for this root'),
      link('Find videos for ' + root + ' ↗', videos(root + ' root words vocabulary lesson')),
      link('Khan Academy · Greek and Latin roots ↗', 'https://www.khanacademy.org/ela/new-6th-grade-reading-and-vocabulary/x8ddea1200317e822:the-rules-we-live-by-and-the-ones-we-break/x8ddea1200317e822:building-background-knowledge/v/latin-and-greek-roots-and-affixes-reading')
    );
    panel.append(links, watch);

    async function load() {
      result.replaceChildren(el('p', 'Looking up pronunciation, meanings and examples…'));
      try {
        var entries = (await lookup(item.word)).slice(0, 2);
        var firstMeaning = (entries[0].meanings || [])[0];
        if (firstMeaning && firstMeaning.partOfSpeech) {
          heading.append(el('span', firstMeaning.partOfSpeech, 'learn-part'));
        }
        var pronunciations = entries.flatMap(function (entry) { return entry.phonetics || []; });
        var phonetic = entries[0].phonetic || (pronunciations.find(function (p) { return p.text; }) || {}).text;
        var audio = pronunciations.find(function (p) { return p.audio && safeUrl(p.audio); });
        if (phonetic) phonetics.append(el('span', phonetic));
        if (audio) {
          var player = el('audio');
          player.controls = true;
          player.preload = 'none';
          player.src = audio.audio;
          player.setAttribute('aria-label', 'Pronunciation of ' + item.word);
          phonetics.append(player);
        }
        phonetics.hidden = !phonetic && !audio;
        result.replaceChildren();
        entries.forEach(function (entry) {
          (entry.meanings || []).forEach(function (meaning) {
            result.append(el('h4', meaning.partOfSpeech || 'Meaning'));
            (meaning.definitions || []).slice(0, 3).forEach(function (definition) {
              result.append(el('p', definition.definition));
              if (definition.example) result.append(el('blockquote', definition.example));
            });
            var synonyms = (meaning.synonyms || []).slice(0, 6);
            if (synonyms.length) result.append(el('p', 'Related words: ' + synonyms.join(', ')));
          });
          sources(result, entry);
        });
      } catch (_) {
        var retry = el('button', 'Try dictionary again');
        retry.type = 'button';
        retry.addEventListener('click', load);
        result.replaceChildren(el('p', 'Dictionary details could not be loaded. You can still use the study definition and dictionary links.'), retry);
      }
    }
    load();
  }

  window.RootWordLearning = {
    render: function (root, roots) {
      var host = document.getElementById('rootLearning');
      if (!host) return;
      host.replaceChildren();
      var names = root === '__all__' ? Object.keys(roots) : [root];
      names = names.filter(function (name) { return roots[name] && roots[name].length; });
      if (!names.length) {
        host.append(el('p', 'Choose a root with words to begin.', 'learn-empty'));
        return;
      }
      var layout = el('div', '', 'learn-layout');
      var words = el('div', '', 'learn-list');
      words.setAttribute('role', 'group');
      words.setAttribute('aria-label', 'Words for the selected root');
      var panel = el('article', '', 'learn-detail');
      panel.setAttribute('aria-labelledby', 'selectedWord');
      layout.append(words, panel);
      host.append(layout);

      var selected;
      names.forEach(function (name) {
        if (names.length > 1) words.append(el('h3', name, 'learn-group'));
        roots[name].forEach(function (item) {
          var button = el('button', '', 'learn-word');
          button.type = 'button';
          button.setAttribute('aria-pressed', 'false');
          button.append(el('strong', item.word), el('span', item.definition || ''));
          function selectWord() {
            if (selected === button) return;
            if (selected) selected.setAttribute('aria-pressed', 'false');
            selected = button;
            button.setAttribute('aria-pressed', 'true');
            renderWord(item, name, panel);
          }
          button.addEventListener('click', selectWord);
          words.append(button);
          if (!selected) selectWord();
        });
      });
    }
  };
})();
