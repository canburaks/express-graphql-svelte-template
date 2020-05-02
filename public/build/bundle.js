
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() {}

    const identity = x => x;

    function add_location(element, file, line, column, char) {
      element.__svelte_meta = {
        loc: {
          file,
          line,
          column,
          char
        }
      };
    }

    function run(fn) {
      return fn();
    }

    function blank_object() {
      return Object.create(null);
    }

    function run_all(fns) {
      fns.forEach(run);
    }

    function is_function(thing) {
      return typeof thing === 'function';
    }

    function safe_not_equal(a, b) {
      return a != a ? b == b : a !== b || a && typeof a === 'object' || typeof a === 'function';
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client ? () => window.performance.now() : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop; // used internally for testing

    const tasks = new Set();

    function run_tasks(now) {
      tasks.forEach(task => {
        if (!task.c(now)) {
          tasks.delete(task);
          task.f();
        }
      });
      if (tasks.size !== 0) raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */


    function loop(callback) {
      let task;
      if (tasks.size === 0) raf(run_tasks);
      return {
        promise: new Promise(fulfill => {
          tasks.add(task = {
            c: callback,
            f: fulfill
          });
        }),

        abort() {
          tasks.delete(task);
        }

      };
    }

    function append(target, node) {
      target.appendChild(node);
    }

    function insert(target, node, anchor) {
      target.insertBefore(node, anchor || null);
    }

    function detach(node) {
      node.parentNode.removeChild(node);
    }

    function element(name) {
      return document.createElement(name);
    }

    function text(data) {
      return document.createTextNode(data);
    }

    function space() {
      return text(' ');
    }

    function listen(node, event, handler, options) {
      node.addEventListener(event, handler, options);
      return () => node.removeEventListener(event, handler, options);
    }

    function prevent_default(fn) {
      return function (event) {
        event.preventDefault(); // @ts-ignore

        return fn.call(this, event);
      };
    }

    function attr(node, attribute, value) {
      if (value == null) node.removeAttribute(attribute);else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
    }

    function children(element) {
      return Array.from(element.childNodes);
    }

    function set_input_value(input, value) {
      if (value != null || input.value) {
        input.value = value;
      }
    }

    function custom_event(type, detail) {
      const e = document.createEvent('CustomEvent');
      e.initCustomEvent(type, false, false, detail);
      return e;
    }

    const active_docs = new Set();
    let active = 0; // https://github.com/darkskyapp/string-hash/blob/master/index.js

    function hash(str) {
      let hash = 5381;
      let i = str.length;

      while (i--) hash = (hash << 5) - hash ^ str.charCodeAt(i);

      return hash >>> 0;
    }

    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
      const step = 16.666 / duration;
      let keyframes = '{\n';

      for (let p = 0; p <= 1; p += step) {
        const t = a + (b - a) * ease(p);
        keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
      }

      const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
      const name = `__svelte_${hash(rule)}_${uid}`;
      const doc = node.ownerDocument;
      active_docs.add(doc);
      const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
      const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});

      if (!current_rules[name]) {
        current_rules[name] = true;
        stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
      }

      const animation = node.style.animation || '';
      node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
      active += 1;
      return name;
    }

    function delete_rule(node, name) {
      const previous = (node.style.animation || '').split(', ');
      const next = previous.filter(name ? anim => anim.indexOf(name) < 0 // remove specific animation
      : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
      );
      const deleted = previous.length - next.length;

      if (deleted) {
        node.style.animation = next.join(', ');
        active -= deleted;
        if (!active) clear_rules();
      }
    }

    function clear_rules() {
      raf(() => {
        if (active) return;
        active_docs.forEach(doc => {
          const stylesheet = doc.__svelte_stylesheet;
          let i = stylesheet.cssRules.length;

          while (i--) stylesheet.deleteRule(i);

          doc.__svelte_rules = {};
        });
        active_docs.clear();
      });
    }

    let current_component;

    function set_current_component(component) {
      current_component = component;
    }

    function get_current_component() {
      if (!current_component) throw new Error(`Function called outside component initialization`);
      return current_component;
    }

    function beforeUpdate(fn) {
      get_current_component().$$.before_update.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;

    function schedule_update() {
      if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
      }
    }

    function add_render_callback(fn) {
      render_callbacks.push(fn);
    }

    let flushing = false;
    const seen_callbacks = new Set();

    function flush() {
      if (flushing) return;
      flushing = true;

      do {
        // first, call beforeUpdate functions
        // and update components
        for (let i = 0; i < dirty_components.length; i += 1) {
          const component = dirty_components[i];
          set_current_component(component);
          update(component.$$);
        }

        dirty_components.length = 0;

        while (binding_callbacks.length) binding_callbacks.pop()(); // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...


        for (let i = 0; i < render_callbacks.length; i += 1) {
          const callback = render_callbacks[i];

          if (!seen_callbacks.has(callback)) {
            // ...so guard against infinite loops
            seen_callbacks.add(callback);
            callback();
          }
        }

        render_callbacks.length = 0;
      } while (dirty_components.length);

      while (flush_callbacks.length) {
        flush_callbacks.pop()();
      }

      update_scheduled = false;
      flushing = false;
      seen_callbacks.clear();
    }

    function update($$) {
      if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
      }
    }

    let promise;

    function wait() {
      if (!promise) {
        promise = Promise.resolve();
        promise.then(() => {
          promise = null;
        });
      }

      return promise;
    }

    function dispatch(node, direction, kind) {
      node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }

    const outroing = new Set();
    let outros;

    function transition_in(block, local) {
      if (block && block.i) {
        outroing.delete(block);
        block.i(local);
      }
    }

    function transition_out(block, local, detach, callback) {
      if (block && block.o) {
        if (outroing.has(block)) return;
        outroing.add(block);
        outros.c.push(() => {
          outroing.delete(block);

          if (callback) {
            if (detach) block.d(1);
            callback();
          }
        });
        block.o(local);
      }
    }

    const null_transition = {
      duration: 0
    };

    function create_bidirectional_transition(node, fn, params, intro) {
      let config = fn(node, params);
      let t = intro ? 0 : 1;
      let running_program = null;
      let pending_program = null;
      let animation_name = null;

      function clear_animation() {
        if (animation_name) delete_rule(node, animation_name);
      }

      function init(program, duration) {
        const d = program.b - t;
        duration *= Math.abs(d);
        return {
          a: t,
          b: program.b,
          d,
          duration,
          start: program.start,
          end: program.start + duration,
          group: program.group
        };
      }

      function go(b) {
        const {
          delay = 0,
          duration = 300,
          easing = identity,
          tick = noop,
          css
        } = config || null_transition;
        const program = {
          start: now() + delay,
          b
        };

        if (!b) {
          // @ts-ignore todo: improve typings
          program.group = outros;
          outros.r += 1;
        }

        if (running_program) {
          pending_program = program;
        } else {
          // if this is an intro, and there's a delay, we need to do
          // an initial tick and/or apply CSS animation immediately
          if (css) {
            clear_animation();
            animation_name = create_rule(node, t, b, duration, delay, easing, css);
          }

          if (b) tick(0, 1);
          running_program = init(program, duration);
          add_render_callback(() => dispatch(node, b, 'start'));
          loop(now => {
            if (pending_program && now > pending_program.start) {
              running_program = init(pending_program, duration);
              pending_program = null;
              dispatch(node, running_program.b, 'start');

              if (css) {
                clear_animation();
                animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
              }
            }

            if (running_program) {
              if (now >= running_program.end) {
                tick(t = running_program.b, 1 - t);
                dispatch(node, running_program.b, 'end');

                if (!pending_program) {
                  // we're done
                  if (running_program.b) {
                    // intro — we can tidy up immediately
                    clear_animation();
                  } else {
                    // outro — needs to be coordinated
                    if (! --running_program.group.r) run_all(running_program.group.c);
                  }
                }

                running_program = null;
              } else if (now >= running_program.start) {
                const p = now - running_program.start;
                t = running_program.a + running_program.d * easing(p / running_program.duration);
                tick(t, 1 - t);
              }
            }

            return !!(running_program || pending_program);
          });
        }
      }

      return {
        run(b) {
          if (is_function(config)) {
            wait().then(() => {
              // @ts-ignore
              config = config();
              go(b);
            });
          } else {
            go(b);
          }
        },

        end() {
          clear_animation();
          running_program = pending_program = null;
        }

      };
    }

    const globals = typeof window !== 'undefined' ? window : global;

    function create_component(block) {
      block && block.c();
    }

    function mount_component(component, target, anchor) {
      const {
        fragment,
        on_mount,
        on_destroy,
        after_update
      } = component.$$;
      fragment && fragment.m(target, anchor); // onMount happens before the initial afterUpdate

      add_render_callback(() => {
        const new_on_destroy = on_mount.map(run).filter(is_function);

        if (on_destroy) {
          on_destroy.push(...new_on_destroy);
        } else {
          // Edge case - component was destroyed immediately,
          // most likely as a result of a binding initialising
          run_all(new_on_destroy);
        }

        component.$$.on_mount = [];
      });
      after_update.forEach(add_render_callback);
    }

    function destroy_component(component, detaching) {
      const $$ = component.$$;

      if ($$.fragment !== null) {
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching); // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)

        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
      }
    }

    function make_dirty(component, i) {
      if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
      }

      component.$$.dirty[i / 31 | 0] |= 1 << i % 31;
    }

    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
      const parent_component = current_component;
      set_current_component(component);
      const prop_values = options.props || {};
      const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        before_update: [],
        after_update: [],
        context: new Map(parent_component ? parent_component.$$.context : []),
        // everything else
        callbacks: blank_object(),
        dirty
      };
      let ready = false;
      $$.ctx = instance ? instance(component, prop_values, (i, ret, ...rest) => {
        const value = rest.length ? rest[0] : ret;

        if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
          if ($$.bound[i]) $$.bound[i](value);
          if (ready) make_dirty(component, i);
        }

        return ret;
      }) : [];
      $$.update();
      ready = true;
      run_all($$.before_update); // `false` as a special case of no DOM component

      $$.fragment = create_fragment ? create_fragment($$.ctx) : false;

      if (options.target) {
        if (options.hydrate) {
          const nodes = children(options.target); // eslint-disable-next-line @typescript-eslint/no-non-null-assertion

          $$.fragment && $$.fragment.l(nodes);
          nodes.forEach(detach);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          $$.fragment && $$.fragment.c();
        }

        if (options.intro) transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor);
        flush();
      }

      set_current_component(parent_component);
    }

    class SvelteComponent {
      $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
      }

      $on(type, callback) {
        const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
        callbacks.push(callback);
        return () => {
          const index = callbacks.indexOf(callback);
          if (index !== -1) callbacks.splice(index, 1);
        };
      }

      $set() {// overridden by instance, if it has props
      }

    }

    function dispatch_dev(type, detail) {
      document.dispatchEvent(custom_event(type, Object.assign({
        version: '3.20.1'
      }, detail)));
    }

    function append_dev(target, node) {
      dispatch_dev("SvelteDOMInsert", {
        target,
        node
      });
      append(target, node);
    }

    function insert_dev(target, node, anchor) {
      dispatch_dev("SvelteDOMInsert", {
        target,
        node,
        anchor
      });
      insert(target, node, anchor);
    }

    function detach_dev(node) {
      dispatch_dev("SvelteDOMRemove", {
        node
      });
      detach(node);
    }

    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
      const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
      if (has_prevent_default) modifiers.push('preventDefault');
      if (has_stop_propagation) modifiers.push('stopPropagation');
      dispatch_dev("SvelteDOMAddEventListener", {
        node,
        event,
        handler,
        modifiers
      });
      const dispose = listen(node, event, handler, options);
      return () => {
        dispatch_dev("SvelteDOMRemoveEventListener", {
          node,
          event,
          handler,
          modifiers
        });
        dispose();
      };
    }

    function attr_dev(node, attribute, value) {
      attr(node, attribute, value);
      if (value == null) dispatch_dev("SvelteDOMRemoveAttribute", {
        node,
        attribute
      });else dispatch_dev("SvelteDOMSetAttribute", {
        node,
        attribute,
        value
      });
    }

    function set_data_dev(text, data) {
      data = '' + data;
      if (text.data === data) return;
      dispatch_dev("SvelteDOMSetData", {
        node: text,
        data
      });
      text.data = data;
    }

    function validate_slots(name, slot, keys) {
      for (const slot_key of Object.keys(slot)) {
        if (!~keys.indexOf(slot_key)) {
          console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
        }
      }
    }

    class SvelteComponentDev extends SvelteComponent {
      constructor(options) {
        if (!options || !options.target && !options.$$inline) {
          throw new Error(`'target' is a required option`);
        }

        super();
      }

      $destroy() {
        super.$destroy();

        this.$destroy = () => {
          console.warn(`Component was already destroyed`); // eslint-disable-line no-console
        };
      }

      $capture_state() {}

      $inject_state() {}

    }

    /* src/sections/Nav.svelte generated by Svelte v3.20.1 */

    const { console: console_1 } = globals;
    const file = "src/sections/Nav.svelte";

    function create_fragment(ctx) {
    	let nav;
    	let div;
    	let img;
    	let img_src_value;
    	let t0;
    	let span;
    	let t2;
    	let ul;
    	let li0;
    	let a0;
    	let t3;
    	let a0_aria_current_value;
    	let t4;
    	let li1;
    	let a1;
    	let t5;
    	let a1_aria_current_value;
    	let t6;
    	let li2;
    	let a2;
    	let t7;
    	let a2_aria_current_value;

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			div = element("div");
    			img = element("img");
    			t0 = space();
    			span = element("span");
    			span.textContent = "STUDIO WOKE";
    			t2 = space();
    			ul = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			t3 = text("home");
    			t4 = space();
    			li1 = element("li");
    			a1 = element("a");
    			t5 = text("about");
    			t6 = space();
    			li2 = element("li");
    			a2 = element("a");
    			t7 = text("blog");
    			if (img.src !== (img_src_value = "/images/logo.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Studio Woke Logo");
    			attr_dev(img, "title", "Studio Woke");
    			attr_dev(img, "class", "brand-logo svelte-1rwz5iu");
    			add_location(img, file, 9, 8, 171);
    			attr_dev(span, "class", "brand-name svelte-1rwz5iu");
    			add_location(span, file, 10, 8, 272);
    			attr_dev(div, "class", "brand-box svelte-1rwz5iu");
    			add_location(div, file, 8, 4, 139);
    			attr_dev(a0, "aria-current", a0_aria_current_value = /*segment*/ ctx[0] === undefined ? "page" : undefined);
    			attr_dev(a0, "href", ".");
    			attr_dev(a0, "class", "svelte-1rwz5iu");
    			add_location(a0, file, 13, 6, 339);
    			attr_dev(li0, "class", "svelte-1rwz5iu");
    			add_location(li0, file, 13, 2, 335);
    			attr_dev(a1, "aria-current", a1_aria_current_value = /*segment*/ ctx[0] === "about" ? "page" : undefined);
    			attr_dev(a1, "href", "about");
    			attr_dev(a1, "class", "svelte-1rwz5iu");
    			add_location(a1, file, 14, 6, 431);
    			attr_dev(li1, "class", "svelte-1rwz5iu");
    			add_location(li1, file, 14, 2, 427);
    			attr_dev(a2, "rel", "prefetch");
    			attr_dev(a2, "aria-current", a2_aria_current_value = /*segment*/ ctx[0] === "blog" ? "page" : undefined);
    			attr_dev(a2, "href", "blog");
    			attr_dev(a2, "class", "svelte-1rwz5iu");
    			add_location(a2, file, 18, 6, 684);
    			attr_dev(li2, "class", "svelte-1rwz5iu");
    			add_location(li2, file, 18, 2, 680);
    			attr_dev(ul, "class", "svelte-1rwz5iu");
    			add_location(ul, file, 12, 1, 328);
    			attr_dev(nav, "id", "navbar");
    			attr_dev(nav, "class", "svelte-1rwz5iu");
    			add_location(nav, file, 7, 0, 117);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, div);
    			append_dev(div, img);
    			append_dev(div, t0);
    			append_dev(div, span);
    			append_dev(nav, t2);
    			append_dev(nav, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a0);
    			append_dev(a0, t3);
    			append_dev(ul, t4);
    			append_dev(ul, li1);
    			append_dev(li1, a1);
    			append_dev(a1, t5);
    			append_dev(ul, t6);
    			append_dev(ul, li2);
    			append_dev(li2, a2);
    			append_dev(a2, t7);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	const segment = window.location.pathname.replace(1);
    	console.log("navbar: ", segment);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Nav> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Nav", $$slots, []);
    	$$self.$capture_state = () => ({ segment });
    	return [segment];
    }

    class Nav extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Nav",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    function fade(node, {
      delay = 0,
      duration = 400,
      easing = identity
    }) {
      const o = +getComputedStyle(node).opacity;
      return {
        delay,
        duration,
        easing,
        css: t => `opacity: ${t * o}`
      };
    }

    /* src/sections/Hero.svelte generated by Svelte v3.20.1 */
    const file$1 = "src/sections/Hero.svelte";

    function create_fragment$1(ctx) {
    	let section;
    	let img;
    	let img_src_value;
    	let t0;
    	let div;
    	let span1;
    	let t1;
    	let br;
    	let t2;
    	let span0;
    	let div_transition;
    	let current;

    	const block = {
    		c: function create() {
    			section = element("section");
    			img = element("img");
    			t0 = space();
    			div = element("div");
    			span1 = element("span");
    			t1 = text("We make");
    			br = element("br");
    			t2 = text("digital beautiful");
    			span0 = element("span");
    			span0.textContent = ".";
    			attr_dev(img, "id", "hero-image");
    			attr_dev(img, "alt", "hero image");
    			if (img.src !== (img_src_value = "./images/tavuskuşu.jpg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "svelte-1ub0w8v");
    			add_location(img, file$1, 6, 4, 88);
    			add_location(br, file$1, 8, 39, 272);
    			attr_dev(span0, "class", "hero-nokta svelte-1ub0w8v");
    			add_location(span0, file$1, 8, 61, 294);
    			attr_dev(span1, "class", "hero-text svelte-1ub0w8v");
    			add_location(span1, file$1, 8, 8, 241);
    			attr_dev(div, "id", "hero-right");
    			attr_dev(div, "class", "svelte-1ub0w8v");
    			add_location(div, file$1, 7, 4, 162);
    			attr_dev(section, "id", "hero");
    			attr_dev(section, "class", "svelte-1ub0w8v");
    			add_location(section, file$1, 5, 0, 64);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, img);
    			append_dev(section, t0);
    			append_dev(section, div);
    			append_dev(div, span1);
    			append_dev(span1, t1);
    			append_dev(span1, br);
    			append_dev(span1, t2);
    			append_dev(span1, span0);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, fade, { delay: 1250, duration: 300 }, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div_transition) div_transition = create_bidirectional_transition(div, fade, { delay: 1250, duration: 300 }, false);
    			div_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			if (detaching && div_transition) div_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Hero> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Hero", $$slots, []);
    	$$self.$capture_state = () => ({ fade });
    	return [];
    }

    class Hero extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Hero",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    function fetcher(query, callback, variables) {
      fetch('/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          query,
          variables
        })
      }).then(r => r.json()).then(data => callback(data));
    }

    /* src/forms/Contact.svelte generated by Svelte v3.20.1 */

    const { console: console_1$1 } = globals;
    const file$2 = "src/forms/Contact.svelte";

    function create_fragment$2(ctx) {
    	let form;
    	let div0;
    	let label0;
    	let t1;
    	let input0;
    	let t2;
    	let div1;
    	let label1;
    	let t4;
    	let input1;
    	let t5;
    	let div2;
    	let label2;
    	let t7;
    	let input2;
    	let t8;
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			form = element("form");
    			div0 = element("div");
    			label0 = element("label");
    			label0.textContent = "İsminiz";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			div1 = element("div");
    			label1 = element("label");
    			label1.textContent = "Email";
    			t4 = space();
    			input1 = element("input");
    			t5 = space();
    			div2 = element("div");
    			label2 = element("label");
    			label2.textContent = "Telefon";
    			t7 = space();
    			input2 = element("input");
    			t8 = space();
    			button = element("button");
    			button.textContent = "GÖNDER";
    			add_location(label0, file$2, 28, 8, 565);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "class", "svelte-1f8u6iv");
    			add_location(input0, file$2, 29, 8, 596);
    			attr_dev(div0, "class", "svelte-1f8u6iv");
    			add_location(div0, file$2, 27, 4, 551);
    			add_location(label1, file$2, 32, 8, 665);
    			attr_dev(input1, "type", "email");
    			attr_dev(input1, "class", "svelte-1f8u6iv");
    			add_location(input1, file$2, 33, 8, 694);
    			attr_dev(div1, "class", "svelte-1f8u6iv");
    			add_location(div1, file$2, 31, 4, 651);
    			add_location(label2, file$2, 36, 8, 765);
    			attr_dev(input2, "type", "tel");
    			attr_dev(input2, "class", "svelte-1f8u6iv");
    			add_location(input2, file$2, 37, 8, 796);
    			attr_dev(div2, "class", "svelte-1f8u6iv");
    			add_location(div2, file$2, 35, 4, 751);
    			attr_dev(button, "type", "submit");
    			add_location(button, file$2, 39, 4, 849);
    			attr_dev(form, "class", "svelte-1f8u6iv");
    			add_location(form, file$2, 26, 0, 500);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, form, anchor);
    			append_dev(form, div0);
    			append_dev(div0, label0);
    			append_dev(div0, t1);
    			append_dev(div0, input0);
    			set_input_value(input0, /*name*/ ctx[0]);
    			append_dev(form, t2);
    			append_dev(form, div1);
    			append_dev(div1, label1);
    			append_dev(div1, t4);
    			append_dev(div1, input1);
    			set_input_value(input1, /*email*/ ctx[1]);
    			append_dev(form, t5);
    			append_dev(form, div2);
    			append_dev(div2, label2);
    			append_dev(div2, t7);
    			append_dev(div2, input2);
    			set_input_value(input2, /*tel*/ ctx[2]);
    			append_dev(form, t8);
    			append_dev(form, button);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(input0, "input", /*input0_input_handler*/ ctx[7]),
    				listen_dev(input1, "input", /*input1_input_handler*/ ctx[8]),
    				listen_dev(input2, "input", /*input2_input_handler*/ ctx[9]),
    				listen_dev(form, "submit", prevent_default(/*handleSubmit*/ ctx[3]), false, true, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*name*/ 1 && input0.value !== /*name*/ ctx[0]) {
    				set_input_value(input0, /*name*/ ctx[0]);
    			}

    			if (dirty & /*email*/ 2 && input1.value !== /*email*/ ctx[1]) {
    				set_input_value(input1, /*email*/ ctx[1]);
    			}

    			if (dirty & /*tel*/ 4) {
    				set_input_value(input2, /*tel*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let name = "";
    	let email = "";
    	let tel;

    	//beforeUpdate(()=>{
    	//    console.log("data", data)
    	//});
    	const query = `
    mutation contactForm($name:String!, $email:String, $tel:String){
        contactForm(name:$name, email:$email, tel:$tel)
    }
`;

    	function callback(data) {
    		console.log("data", data);
    	}

    	function handleSubmit() {
    		fetcher(query, callback, data);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<Contact> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Contact", $$slots, []);

    	function input0_input_handler() {
    		name = this.value;
    		$$invalidate(0, name);
    	}

    	function input1_input_handler() {
    		email = this.value;
    		$$invalidate(1, email);
    	}

    	function input2_input_handler() {
    		tel = this.value;
    		$$invalidate(2, tel);
    	}

    	$$self.$capture_state = () => ({
    		beforeUpdate,
    		fetcher,
    		name,
    		email,
    		tel,
    		query,
    		callback,
    		handleSubmit,
    		data
    	});

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("email" in $$props) $$invalidate(1, email = $$props.email);
    		if ("tel" in $$props) $$invalidate(2, tel = $$props.tel);
    		if ("data" in $$props) data = $$props.data;
    	};

    	let data;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*name, email, tel*/ 7) {
    			 data = { name, email, tel };
    		}
    	};

    	return [
    		name,
    		email,
    		tel,
    		handleSubmit,
    		data,
    		query,
    		callback,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler
    	];
    }

    class Contact extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Contact",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    function styleInject(css, ref) {
      if (ref === void 0) ref = {};
      var insertAt = ref.insertAt;

      if (!css || typeof document === 'undefined') {
        return;
      }

      var head = document.head || document.getElementsByTagName('head')[0];
      var style = document.createElement('style');
      style.type = 'text/css';

      if (insertAt === 'top') {
        if (head.firstChild) {
          head.insertBefore(style, head.firstChild);
        } else {
          head.appendChild(style);
        }
      } else {
        head.appendChild(style);
      }

      if (style.styleSheet) {
        style.styleSheet.cssText = css;
      } else {
        style.appendChild(document.createTextNode(css));
      }
    }

    var css_248z = "@import \"./style/atoms.css\";\n\n\nbody {\n    font-family:arial;\n    overflow-x: hidden;\n    margin:0;\n    width:100%;\n    max-width:100%;\n    min-height:1800px;\n}\n";
    styleInject(css_248z);

    var css_248z$1 = ":root{\n    --zero:0;\n    --x:4px;\n    --xx:8px;\n    --xxx:16px;\n    --xxxx:32px;\n    --xxxxx:64px;\n}\n\n/* VARIOUS */\n.hidden {\n    display:none;\n}\n.invisible {\n    visibility: hidden;\n}\n.visible {\n    visibility: visible;\n}\n\n[data-display=\"flex\"] {\n    display:flex;\n}\n[data-display=\"none\"] {\n    display:none;\n}\n\n\n\n/* FLOAT */\n.fl-r{\n    float: right;\n}\n.fl-l{\n    float:left;\n}\n\n\n/* POSITION */\n.pos-r {\n    position:absolute;\n}\n.pos-a {\n    position:relative;\n}\n\n.l-0 {\n    left:0\n}\n.t-0 {\n    top:0;\n}\n.b-0 {\n    bottom:0;\n}\n.r-0 {\n    right:0;\n}\n\n\n/* FLEXBOX */\n.fbox-c {\n    display:flex;\n    flex-direction:column;\n}\n.fbox, .fbox-r {\n    display:flex;\n    flex-direction:row;\n}\n.jcc {\n    justify-content:center;\n}\n.jcsb {\n    justify-content:space-between;\n}\n.jcsa {\n    justify-content: space-around;\n}\n.jcfe {\n    justify-content: flex-end;\n}\n.aic {\n    align-items:center;\n}\n.aifs {\n    align-items:flex-start;\n}\n.aife {\n    align-items:flex-end;\n}\n.ais {\n    align-items: stretch;\n} \n\n\n/*  PAD */\n.p-0 {\n    padding:0;\n}\n.p-1 {\n    padding:var(--x);\n}\n.p-2 {\n    padding:var(--xx);\n}\n.p-3 {\n    padding:var(--xxx);\n}\n.p-4 {\n    padding:var(--xxxx);\n}\n.p-5 {\n    padding:var(--xxxxx);\n}\n/*top*/\n.pt-0 {\n    padding-top:0;\n}\n.pt-1 {\n    padding-top:var(--x);\n}\n.pt-2 {\n    padding-top:var(--xx);\n}\n.pt-3 {\n    padding-top:var(--xxx);\n}\n.pt-4 {\n    padding-top:var(--xxxx);\n}\n.pt-5 {\n    padding-top:var(--xxxxx);\n}\n\n/*bottom*/\n.pb-0 {\n    padding-bottom:0;\n}\n.pb-1 {\n    padding-bottom:var(--x);\n}\n.pb-2 {\n    padding-bottom:var(--xx);\n}\n.pb-3 {\n    padding-bottom:var(--xxx);\n}\n.pb-4 {\n    padding-bottom:var(--xxxx);\n}\n.pb-5 {\n    padding-bottom:var(--xxxxx);\n}\n/*left*/\n.pl-0 {\n    padding-left:0;\n}\n.pl-1 {\n    padding-left:var(--x);\n}\n.pl-2 {\n    padding-left:var(--xx);\n}\n.pl-3 {\n    padding-left:var(--xxx);\n}\n.pl-4 {\n    padding-left:var(--xxxx);\n}\n.pl-5 {\n    padding-left:var(--xxxxx);\n}\n/*right*/\n.pr-0 {\n    padding-right:0;\n}\n.pr-1 {\n    padding-right:var(--x);\n}\n.pr-2 {\n    padding-right:var(--xx);\n}\n.pr-3 {\n    padding-right:var(--xxx);\n}\n.pr-4 {\n    padding-right:var(--xxxx);\n}\n.pr-5 {\n    padding-right:var(--xxxxx);\n}\n/*left-right*/\n.plr-0 {\n    padding-right:0;\n    padding-left:0;\n}\n.plr-1 {\n    padding-right:var(--x);\n    padding-left:var(--x);\n}\n.plr-2 {\n    padding-right:var(--xx);\n    padding-left:var(--xx);\n}\n.plr-3 {\n    padding-right:var(--xxx);\n    padding-left:var(--xxx);\n}\n.plr-4 {\n    padding-right:var(--xxxx);\n    padding-left:var(--xxxx);\n}\n.plr-5 {\n    padding-right:var(--xxxxx);\n    padding-left:var(--xxxxx);\n}\n/*top-bottom*/\n.plr-0 {\n    padding-top:0;\n    padding-bottom:0;\n}\n.plr-1 {\n    padding-top:var(--x);\n    padding-bottom:var(--x);\n}\n.plr-2 {\n    padding-top:var(--xx);\n    padding-bottom:var(--xx);\n}\n.plr-3 {\n    padding-top:var(--xxx);\n    padding-bottom:var(--xxx);\n}\n.plr-4 {\n    padding-top:var(--xxxx);\n    padding-bottom:var(--xxxx);\n}\n.plr-5 {\n    padding-top:var(--xxxxx);\n    padding-bottom:var(--xxxxx);\n}\n\n/*------- MARGIN ---------------- */\n.m-0 {\n    margin:0;\n}\n.m-1 {\n    margin:var(--x);\n}\n.m-2 {\n    margin:var(--xx);\n}\n.m-3 {\n    margin:var(--xxx);\n}\n.m-4 {\n    margin:var(--xxxx);\n}\n.m-5 {\n    margin:var(--xxxxx);\n}\n\n/*top*/\n.mt-0 {\n    margin-top:0;\n}\n.mt-1 {\n    margin-top:var(--x);\n}\n.mt-2 {\n    margin-top:var(--xx);\n}\n.mt-3 {\n    margin-top:var(--xxx);\n}\n.mt-4 {\n    margin-top:var(--xxxx);\n}\n.mt-5 {\n    margin-top:var(--xxxxx);\n}\n\n/*bottom*/\n.mb-0 {\n    margin-bottom:0;\n}\n.mb-1 {\n    margin-bottom:var(--x);\n}\n.mb-2 {\n    margin-bottom:var(--xx);\n}\n.mb-3 {\n    margin-bottom:var(--xxx);\n}\n.mb-4 {\n    margin-bottom:var(--xxxx);\n}\n.mb-5 {\n    margin-bottom:var(--xxxxx);\n}\n\n/*left*/\n.ml-0 {\n    margin-left:0;\n}\n.ml-1 {\n    margin-left:var(--x);\n}\n.ml-2 {\n    margin-left:var(--xx);\n}\n.ml-3 {\n    margin-left:var(--xxx);\n}\n.ml-4 {\n    margin-left:var(--xxxx);\n}\n.ml-5 {\n    margin-left:var(--xxxxx);\n}\n\n/*right*/\n.mr-0 {\n    margin-right:0;\n}\n.mr-1 {\n    margin-right:var(--x);\n}\n.mr-2 {\n    margin-right:var(--xx);\n}\n.mr-3 {\n    margin-right:var(--xxx);\n}\n.mr-4 {\n    margin-right:var(--xxxx);\n}\n.mr-5 {\n    margin-right:var(--xxxxx);\n}\n/*left-right*/\n.mlr-0 {\n    margin-right:0;\n    margin-left:0;\n}\n.mlr-1 {\n    margin-right:var(--x);\n    margin-left:var(--x);\n}\n.mlr-2 {\n    margin-right:var(--xx);\n    margin-left:var(--xx);\n}\n.mlr-3 {\n    margin-right:var(--xxx);\n    margin-left:var(--xxx);\n}\n.mlr-4 {\n    margin-right:var(--xxxx);\n    margin-left:var(--xxxx);\n}\n.mlr-5 {\n    margin-right:var(--xxxxx);\n    margin-left:var(--xxxxx);\n}\n/*top-bottom*/\n.mlr-0 {\n    margin-top:0;\n    margin-bottom:0;\n}\n.mlr-1 {\n    margin-top:var(--x);\n    margin-bottom:var(--x);\n}\n.mlr-2 {\n    margin-top:var(--xx);\n    margin-bottom:var(--xx);\n}\n.mlr-3 {\n    margin-top:var(--xxx);\n    margin-bottom:var(--xxx);\n}\n.mlr-4 {\n    margin-top:var(--xxxx);\n    margin-bottom:var(--xxxx);\n}\n.mlr-5 {\n    margin-top:var(--xxxxx);\n    margin-bottom:var(--xxxxx);\n}\n";
    styleInject(css_248z$1);

    const Head = {
      title: "Studio Woke - E-Ticaret, Web Tasarım, SEO partneriniz",
      description: ""
    };

    /* src/App.svelte generated by Svelte v3.20.1 */
    const file$3 = "src/App.svelte";

    function create_fragment$3(ctx) {
    	let title_value;
    	let meta;
    	let meta_content_value;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let main;
    	let h1;
    	let t4;
    	let t5;
    	let t6;
    	let t7;
    	let p;
    	let t8;
    	let a;
    	let t10;
    	let current;
    	document.title = title_value = Head.title;
    	const nav = new Nav({ $$inline: true });
    	const hero = new Hero({ $$inline: true });
    	const contact = new Contact({ $$inline: true });

    	const block = {
    		c: function create() {
    			meta = element("meta");
    			t0 = space();
    			create_component(nav.$$.fragment);
    			t1 = space();
    			create_component(hero.$$.fragment);
    			t2 = space();
    			create_component(contact.$$.fragment);
    			t3 = space();
    			main = element("main");
    			h1 = element("h1");
    			t4 = text("Hello ");
    			t5 = text(/*name*/ ctx[0]);
    			t6 = text("!");
    			t7 = space();
    			p = element("p");
    			t8 = text("Visit the ");
    			a = element("a");
    			a.textContent = "Svelte tutorial";
    			t10 = text(" to learn how to build Svelte apps.");
    			attr_dev(meta, "name", "description");
    			attr_dev(meta, "content", meta_content_value = Head.description);
    			add_location(meta, file$3, 13, 1, 287);
    			attr_dev(h1, "class", "mt-0 svelte-2rxyrs");
    			add_location(h1, file$3, 20, 1, 405);
    			attr_dev(a, "href", "https://svelte.dev/tutorial");
    			add_location(a, file$3, 21, 14, 455);
    			add_location(p, file$3, 21, 1, 442);
    			attr_dev(main, "class", "svelte-2rxyrs");
    			add_location(main, file$3, 19, 0, 396);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document.head, meta);
    			insert_dev(target, t0, anchor);
    			mount_component(nav, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(hero, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(contact, target, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(h1, t4);
    			append_dev(h1, t5);
    			append_dev(h1, t6);
    			append_dev(main, t7);
    			append_dev(main, p);
    			append_dev(p, t8);
    			append_dev(p, a);
    			append_dev(p, t10);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if ((!current || dirty & /*Head*/ 0) && title_value !== (title_value = Head.title)) {
    				document.title = title_value;
    			}

    			if (!current || dirty & /*name*/ 1) set_data_dev(t5, /*name*/ ctx[0]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(nav.$$.fragment, local);
    			transition_in(hero.$$.fragment, local);
    			transition_in(contact.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(nav.$$.fragment, local);
    			transition_out(hero.$$.fragment, local);
    			transition_out(contact.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			detach_dev(meta);
    			if (detaching) detach_dev(t0);
    			destroy_component(nav, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(hero, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(contact, detaching);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(main);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { name } = $$props;
    	const writable_props = ["name"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$set = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    	};

    	$$self.$capture_state = () => ({ Nav, Hero, Contact, Head, name });

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [name];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { name: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[0] === undefined && !("name" in props)) {
    			console.warn("<App> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
      target: document.body.querySelector("#app"),
      props: {
        name: 'world'
      }
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
