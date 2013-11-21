/**
 * mini-event
 * Copyright 2013 Baidu Inc. All rights reserved.
 *
 * @ignore
 * @file 事件队列
 * @author otakustay
 */
define(
    function (require) {
        var lib = require('./lib');

        /**
         * 事件队列
         *
         * @constructor
         */
        function EventQueue() {
            this.queue = [];
        }

        /**
         * 添加一个事件处理函数
         *
         * @param {Function | false} handler 处理函数
         * @param {Object} [options] 相关配置
         * @param {Mixed} [options.thisObject] 执行处理函数时的`this`对象
         * @param {boolean} [options.once] 设定函数仅执行一次
         */
        EventQueue.prototype.add = function (handler, options) {
            if (handler !== false && typeof handler !== 'function') {
                throw new Error(
                    'event handler must be a function or const false');
            }

            var wrapper = {
                handler: handler
            };
            lib.extend(wrapper, options);

            for (var i = 0; i < this.queue.length; i++) {
                var context = this.queue[i];
                // 同样的处理函数，不同的`this`对象，相当于外面`bind`了一把再添加，
                // 此时认为这是完全不同的2个处理函数，但`null`和`undefined`认为是一样的
                if (context
                    && context.handler === handler
                    && (context.thisObject == wrapper.thisObject)
                ) {
                    return;
                }
            }

            this.queue.push(wrapper);
        };

        /**
         * 移除一个或全部处理函数
         *
         * @param {Function | false} [handler] 指定移除的处理函数，
         * 如不提供则移除全部处理函数
         * @param {Mixed} [thisObject] 指定函数对应的`this`对象，
         * 不提供则仅移除没有挂载`this`对象的那些处理函数
         */
        EventQueue.prototype.remove = function (handler, thisObject) {
            // 如果没提供`handler`，则直接清空
            if (!handler) {
                this.clear();
                return;
            }

            for (var i = 0; i < this.queue.length; i++) {
                var context = this.queue[i];

                if (context
                    && context.handler === handler
                    && context.thisObject == thisObject
                ) {
                    // 为了让`execute`过程中调用的`remove`工作正常，
                    // 这里不能用`splice`直接删除，仅设为`null`留下这个空间
                    this.queue[i] = null;

                    // 完全符合条件的处理函数在`add`时会去重，因此这里肯定只有一个
                    return;
                }
            }
        };

        /**
         * 移除全部处理函数
         */
        EventQueue.prototype.clear = function () {
            this.queue.length = 0;
        };

        /**
         * 执行所有处理函数
         *
         * @param {Event} event 事件对象
         * @param {Mixed} thisObject 函数执行时的`this`对象
         */
        EventQueue.prototype.execute = function (event, thisObject) {
            for (var i = 0; i < this.queue.length; i++) {
                if (typeof event.isImmediatePropagationStopped === 'function'
                    && event.isImmediatePropagationStopped()
                ) {
                    return;
                }

                var context = this.queue[i];

                // 移除事件时设置为`null`，因此可能无值
                if (!context) {
                    continue;
                }

                var handler = context.handler;

                if (handler === false) {
                    if (typeof event.preventDefault === 'function') {
                        event.preventDefault();
                    }
                    if (typeof event.stopPropagation === 'function') {
                        event.stopPropagation();
                    }
                }
                else {
                    // 这里不需要做去重处理了，在`on`的时候会去重，因此这里不可能重复
                    handler.call(context.thisObject || thisObject, event);
                }

                if (context.once) {
                    this.remove(context.handler);
                }
            }
        };

        /**
         * 销毁
         */
        EventQueue.prototype.dispose = function () {
            this.queue = null;
        };

        return EventQueue;
    }
);
