class MockClassList {
  constructor(element) {
    this.element = element;
    this.classes = new Set();
  }

  add(...classNames) {
    classNames.forEach((name) => {
      if (name) {
        this.classes.add(name);
      }
    });
    this._sync();
  }

  remove(...classNames) {
    classNames.forEach((name) => {
      if (name) {
        this.classes.delete(name);
      }
    });
    this._sync();
  }

  contains(name) {
    return this.classes.has(name);
  }

  toggle(name) {
    if (this.classes.has(name)) {
      this.classes.delete(name);
      this._sync();
      return false;
    }
    this.classes.add(name);
    this._sync();
    return true;
  }

  setFromAttribute(value) {
    this.classes = new Set((value || '').split(/\s+/).filter(Boolean));
  }

  toString() {
    return Array.from(this.classes).join(' ');
  }

  _sync() {
    const classValue = this.toString();
    if (classValue) {
      this.element.attributes.set('class', classValue);
    } else {
      this.element.attributes.delete('class');
    }
  }
}

class MockEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.bubbles = Boolean(options.bubbles);
    this.cancelable = Boolean(options.cancelable);
    this.defaultPrevented = false;
    this.target = null;
    this.currentTarget = null;
  }

  preventDefault() {
    if (this.cancelable) {
      this.defaultPrevented = true;
    }
  }
}

class MockCustomEvent extends MockEvent {
  constructor(type, options = {}) {
    super(type, options);
    this.detail = options.detail;
  }
}

class MockElement {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.parent = null;
    this.attributes = new Map();
    this.classList = new MockClassList(this);
    this.eventListeners = new Map();
    this.onclick = null;
    this._textContent = '';
    this._value = '';
    this.innerHTML = '';
  }

  append(...nodes) {
    nodes.forEach((node) => {
      if (!(node instanceof MockElement)) {
        throw new Error('Only MockElement instances can be appended');
      }
      if (node.parent) {
        node.parent.removeChild(node);
      }
      node.parent = this;
      this.children.push(node);
    });
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) {
      this.children.splice(index, 1);
      child.parent = null;
    }
  }

  remove() {
    if (this.parent) {
      this.parent.removeChild(this);
    }
  }

  setAttribute(name, value) {
    const stringValue = String(value);
    this.attributes.set(name, stringValue);
    if (name === 'class') {
      this.classList.setFromAttribute(stringValue);
    } else if (name === 'id') {
      this.id = stringValue;
    } else if (name === 'disabled') {
      this.disabled = true;
    }
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
    if (name === 'id') {
      this.id = undefined;
    } else if (name === 'disabled') {
      this.disabled = false;
    }
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  addEventListener(type, handler) {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type).push(handler);
  }

  dispatchEvent(event) {
    if (!event.target) {
      event.target = this;
    }
    event.currentTarget = this;
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach((listener) => {
      listener.call(this, event);
    });
    return !event.defaultPrevented;
  }

  click() {
    if (typeof this.onclick === 'function') {
      this.onclick({ target: this });
    }
    const listeners = this.eventListeners.get('click') || [];
    listeners.forEach((listener) => listener.call(this, { target: this, type: 'click' }));
  }

  matches(selector) {
    if (selector.startsWith('.')) {
      return this.classList.contains(selector.slice(1));
    }
    if (selector.startsWith('#')) {
      return this.getAttribute('id') === selector.slice(1);
    }
    return this.tagName === selector.toUpperCase();
  }

  querySelector(selector) {
    for (const child of this.children) {
      if (child.matches(selector)) {
        return child;
      }
      const match = child.querySelector(selector);
      if (match) {
        return match;
      }
    }
    return null;
  }

  querySelectorAll(selector) {
    const results = [];
    for (const child of this.children) {
      if (child.matches(selector)) {
        results.push(child);
      }
      results.push(...child.querySelectorAll(selector));
    }
    return results;
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(value) {
    this._textContent = String(value);
  }

  get value() {
    return this._value;
  }

  set value(value) {
    this._value = String(value);
  }
}

class MockDocument {
  constructor() {
    this.body = new MockElement('body', this);
    this.eventListeners = new Map();
    this.defaultView = null;
  }

  createElement(tagName) {
    return new MockElement(tagName, this);
  }

  querySelector(selector) {
    if (this.body.matches(selector)) {
      return this.body;
    }
    return this.body.querySelector(selector);
  }

  querySelectorAll(selector) {
    const matches = [];
    if (this.body.matches(selector)) {
      matches.push(this.body);
    }
    matches.push(...this.body.querySelectorAll(selector));
    return matches;
  }

  addEventListener(type, handler) {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type).push(handler);
  }

  dispatchEvent(event) {
    if (!event.target) {
      event.target = this;
    }
    event.currentTarget = this;
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach((listener) => listener.call(this, event));
    return !event.defaultPrevented;
  }
}

class MockLocalStorage {
  constructor() {
    this.store = {};
  }

  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }

  setItem(key, value) {
    this.store[key] = String(value);
  }

  removeItem(key) {
    delete this.store[key];
  }

  clear() {
    this.store = {};
  }

  key(index) {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }

  get length() {
    return Object.keys(this.store).length;
  }
}

class MockWindow {
  constructor(document) {
    this.document = document;
    this.localStorage = new MockLocalStorage();
    this.Event = MockEvent;
    this.CustomEvent = MockCustomEvent;
  }
}

function buildBaseStructure(document) {
  const addTaskButton = document.createElement('button');
  addTaskButton.classList.add('app__button--add-task');
  document.body.append(addTaskButton);

  const form = document.createElement('form');
  form.classList.add('app__form-add-task');
  form.classList.add('hidden');
  const textarea = document.createElement('textarea');
  textarea.classList.add('app__form-textarea');
  form.append(textarea);
  document.body.append(form);

  const taskList = document.createElement('ul');
  taskList.classList.add('app__section-task-list');
  document.body.append(taskList);

  const activeTaskDescription = document.createElement('p');
  activeTaskDescription.classList.add('app__section-active-task-description');
  document.body.append(activeTaskDescription);

  const removeCompleted = document.createElement('button');
  removeCompleted.setAttribute('id', 'btn-remover-concluidas');
  document.body.append(removeCompleted);

  const removeAll = document.createElement('button');
  removeAll.setAttribute('id', 'btn-remover-todas');
  document.body.append(removeAll);
}

function createDomEnvironment() {
  const document = new MockDocument();
  const window = new MockWindow(document);
  document.defaultView = window;
  buildBaseStructure(document);

  const applyGlobals = () => {
    global.window = window;
    global.document = document;
    global.localStorage = window.localStorage;
    global.Event = window.Event;
    global.CustomEvent = window.CustomEvent;
  };

  const cleanup = () => {
    delete global.window;
    delete global.document;
    delete global.localStorage;
    delete global.Event;
    delete global.CustomEvent;
  };

  return { window, document, applyGlobals, cleanup };
}

module.exports = {
  createDomEnvironment,
  MockEvent,
  MockCustomEvent,
};
