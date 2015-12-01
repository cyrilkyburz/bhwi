/// <reference path="../typings/tsd.d.ts" />

class BhwiOptions {
  options: any;

  constructor(bhwi_options: any) {
    var default_options = {
      dom_element: 'bhwi', // any id
      type: 'instagram', // or bhwi
      speed: 4000, // ms (only for silder)
      form: 'timeline', // or slider
      images_number: 8, // only for timeline
      lightbox: true,
      lightbox_key_navigation: {
        previous: 37,
        next: 39
      },
      lightbox_background: false,
      preloading_images: true,
      // url: 'api-url' // if type: 'bhwi'
      // client_id: '1234' // if type: 'instagram'
    };

    this.options = jQuery.extend(default_options, bhwi_options);
    this._validateOptions();
  }

  _validateOptions () {
    if (this.options.type == 'instagram') {
      if (this.options.client_id == null) { throw new Error('For the instagram API the "client_id" is needed.') }
    } else  {
      if (this.options.url == null) { throw new Error('For the bhwi API the "url" is needed.') }
    }
  }
}

class BhwiHelper {
  dom_element: any;
  timer: any;

  constructor(dom_element: string) {
    this.dom_element = jQuery('#' + dom_element).addClass('bhwi');
    this.timer = {};
  }

  buildLink(link_url: string) {
    return jQuery('<a>').attr({href: link_url, target: '_blank'});
  }

  buildImage(image_id: number, image_url: string) {
    return jQuery('<div>').css('background', 'url("' + image_url + '") center no-repeat').addClass('bhwi-image').data('bhwi-image-id', image_id);
  }

  buildSlide(link_url: string, image_id: number, image_url: string) {
    return this.buildLink(link_url).append(this.buildImage(image_id, image_url));
  }

  buildDescription(link_url: string, author: string, text: string, created_time: number) {
    var nav = jQuery('<div>').addClass('bhwi-navigation').append(this.buildLeftAngleIcon(), this.buildRightAngleIcon(), this.buildCrossIcon());
    var hr = jQuery('<hr>');
    var desc = jQuery('<div>').addClass('bhwi-description').text(text);
    var link = this.buildLink(link_url).addClass('bhwi-author').text('@' + author);
    var time = jQuery('<span>').text(this.shortDateFormat(new Date(created_time * 1000)));
    var bh_link = this.buildLink('https://www.blogger-heaven.com/').text('blogger-heaven.com');
    var credits = jQuery('<div>').addClass('bhwi-credits').append(bh_link);
    var footer = jQuery('<footer>').append(hr.clone(), credits);
    return [nav, link, hr, desc, footer];
  }

  buildBackground(image_url: string) {
    return jQuery('<div>').addClass('bhwi-full-background').css('background', 'url("' + image_url + '") center no-repeat');
  }

  buildIcon(paths: any, id:string = '', css_class: string = '') {
    var icon = '';
    jQuery.each(paths, function(index, path) {
      icon += '<path d="'+path+'"></path>';
    });
    return jQuery('<svg id="'+id+'" class="bhwi-icon '+css_class+'" version="1.1" xmlns="http://www.w3.org/2000/svg"><g>'+icon+'</g></svg>');
  }

  buildCrossIcon() {
    return this.buildIcon(['M0,0l20,20', 'M20,0l-20,20'], 'close-lightbox', 'close');
  }

  buildLeftAngleIcon() {
    return this.buildIcon(['M40,0l-30,30l30,30'], 'previous-bhwi-image', 'left');
  }

  buildRightAngleIcon() {
    return this.buildIcon(['m0,0l30,30l-30,30'], 'next-bhwi-image', 'right');
  }

  append(jquery_element: any) {
    jquery_element.appendTo(this.dom_element);
  }

  interval(func: any, delay: number) {
    func();
    var func_wrapper = () => { this.interval(func, delay) };
    setTimeout(func_wrapper, delay);
  }

  delay(key: string, func: any, delay: number) {
    clearTimeout(this.timer[key]);
    this.timer[key] = setTimeout(func, delay);
  }

  nullTry(object: any, key: string) {
    if (object == null) {
      return object
    } else {
      return object[key]
    }
  }

  shortDateFormat(date: Date) {
    return date.getDate()+"."+(date.getMonth()+1)+"."+date.getFullYear()
  }

  check_index(position: number, total_images: number) {
    if (position > total_images) { return 0 }
    if (position < 0) { return total_images }
    return position;
  }
}

// not cross browser supported, see: http://caniuse.com/#feat=touch
class BhwiTouch {
  dom_element: string;
  startX: number;
  endX: number;
  tolerance: number;
  rightCallback: Function;
  leftCallback: Function;
  remainedCallback: Function;

  constructor(dom_element: string, rightCallback: Function, leftCallback: Function, remainedCallback: Function) {
    this.dom_element = dom_element;
    this.tolerance = 10;
    this.rightCallback = rightCallback;
    this.leftCallback = leftCallback;
    this.remainedCallback = remainedCallback;
  }

  _initEvents() {
    var doc = jQuery(document);
    doc.on('touchstart', this.dom_element, this._start);
    doc.on('touchend', this.dom_element, this._end);
  }

  _start(event: any) {
    event.preventDefault();
    this.startX = this._getX(event);
  }

  _end(event: any) {
    event.preventDefault();
    this.endX = this._getX(event);
    event._execCallback();
  }

  _getX(event: any) {
    return event.originalEvent.changedTouches[0].pageX;
  }

  _execCallback() {
    if (this.startX - this.endX + this.tolerance < 0) { this.rightCallback() }
    if (this.startX - this.endX - this.tolerance > 0) { this.leftCallback() }
    this.remainedCallback();
  }
}

class BhwiSlider {
  bhwi_helper: BhwiHelper;
  bhwi_images: BhwiImages;
  bhwi_options: BhwiOptions;
  current_image: BhwiImage;
  current_dom: any;
  speed: number;

  constructor(bhwi_helper: BhwiHelper, bhwi_images: BhwiImages, bhwi_options: BhwiOptions) {
    this.bhwi_helper = bhwi_helper;
    this.bhwi_images = bhwi_images;
    this.bhwi_options = bhwi_options;
    this.current_image = this.bhwi_images.find(0);
    this.speed = this.bhwi_options.options.speed;
    this.bhwi_helper.interval(this._sildeImage, this.speed);
    this.bhwi_helper.dom_element.addClass('bhwi-slider');
  }

  _setImage(bhwi_image: BhwiImage) {
    if (this.current_dom != null) { this.current_dom.fadeOut(this.speed / 2); }
    this.current_dom = this.bhwi_helper.dom_element.find('.bhwi-image:eq('+bhwi_image.id+')').parent();

    if (this.current_dom.length) {
      this.current_dom.fadeIn(this.speed / 2);
    } else {
      this.current_dom = this.bhwi_helper.buildSlide(bhwi_image.link, bhwi_image.id, bhwi_image.low).fadeIn(this.speed / 2);
      this.bhwi_helper.append(this.current_dom);
    }

    this.current_image = bhwi_image;
  }

  _sildeImage = () => {
    var next_image_id = this.bhwi_helper.check_index(this.current_image.id + 1, this.bhwi_images.images.length - 1);
    if (this.current_dom == null) { next_image_id = 0 }
    this._setImage(this.bhwi_images.find(next_image_id));
  };
}

class BhwiTimeline {
  bhwi_helper: BhwiHelper;
  bhwi_images: BhwiImages;
  bhwi_options: BhwiOptions;

  constructor(bhwi_helper: BhwiHelper, bhwi_images: BhwiImages, bhwi_options: BhwiOptions) {
    this.bhwi_helper = bhwi_helper;
    this.bhwi_images = bhwi_images;
    this.bhwi_options = bhwi_options;

    this.bhwi_helper.dom_element.addClass('bhwi-timeline');

    this._setAllImages();
    this._resizeImages();
    this._responsiveImages();
  }

  _setAllImages () {
    jQuery.each(this.bhwi_images.images, (index: number, bhwi_image: BhwiImage) => {
      var image_wrapper = this.bhwi_helper.buildSlide(bhwi_image.link, bhwi_image.id, bhwi_image.low);
      this.bhwi_helper.append(image_wrapper);
      if (index == (this.bhwi_options.options.images_number - 1)) return false;
    });
  }

  _resizeImages () {
    var images = jQuery(this.bhwi_helper.dom_element).find('.bhwi-image');
    var size = this.bhwi_helper.dom_element.width() / this.bhwi_options.options.images_number - 6
    images.height(size).width(size)
  }

  _responsiveImages () {
    jQuery(window).resize( () => { this._resizeImages() });
  }
}

class BhwiLightbox {
  bhwi_helper: BhwiHelper;
  bhwi_options: BhwiOptions;
  bhwi_images: BhwiImages;
  current_image: BhwiImage;
  dom_element: any;

  constructor(bhwi_helper: BhwiHelper, bhwi_options: BhwiOptions, bhwi_images: BhwiImages) {
    this.bhwi_helper = bhwi_helper;
    this.bhwi_options = bhwi_options;
    this.bhwi_images = bhwi_images;
    this._buildLightbox();
  }

  _buildLightbox() {
    var image_section = jQuery('<div>').addClass('bhwi-image-section');
    var text_section = jQuery('<div>').addClass('bhwi-text-section');
    var content = jQuery('<div>').addClass('bhwi-content');
    var background = jQuery('<div>').addClass('bhwi-full-background');
    var lightbox = jQuery('<div>').addClass('bhwi-lightbox').attr('id', 'bhwi-lightbox');
    this.dom_element = lightbox.append(background, content.append(image_section, text_section)).appendTo('body');
    this._addLightboxListener();
    this._addCloseListener();
  }

  _addLightboxListener() {
    var callback = (event: any) => {
      event.preventDefault();
      this._addImageToLightbox(this.bhwi_images.find(jQuery(event.target).data('bhwi-image-id')));
    };

    if (this.bhwi_options.options.form == 'slider') {
      jQuery('#bhwi').on('click', '.bhwi-image', callback);
    } else {
      jQuery('.bhwi-image').click(callback);
    }
  }

  _addCloseListener() {
    this.dom_element.click((event :any) => {
      if (jQuery(event.target).attr('id') == 'close-lightbox' || ! jQuery(event.target).closest('.bhwi-content').length &&
        jQuery(event.target).attr('class') != '' &&
        jQuery(event.target).attr('class').indexOf('bhwi-icon') == -1) {
        this.dom_element.fadeOut();
      }
    });
  }

  _addPreviousImage(total_images: number) {
    this._addImageToLightbox(this.bhwi_images.find(this.bhwi_helper.check_index(this.current_image.id - 1, total_images)));
  }

  _addNextImage(total_images: number) {
    this._addImageToLightbox(this.bhwi_images.find(this.bhwi_helper.check_index(this.current_image.id + 1, total_images)));
  }

  _addNavigationListener() {
    var total_images = this.bhwi_options.options.form == 'timeline' ? this.bhwi_options.options.images_number : this.bhwi_images.images.length;
    total_images--;

    jQuery('#previous-bhwi-image').click(() => {
      this._addPreviousImage(total_images);
    });

    jQuery('#next-bhwi-image').click(() => {
      this._addNextImage(total_images);
    });

    if (this.bhwi_options.options.lightbox_key_navigation != false) {
      jQuery(document).keyup( (event) => {
        this.bhwi_helper.delay('lightbox-navigation', () => {
          if (event.which == this.bhwi_options.options.lightbox_key_navigation.previous) {
            this._addPreviousImage(total_images);
          }
          if (event.which == this.bhwi_options.options.lightbox_key_navigation.next) {
            this._addNextImage(total_images);
          }
        }, 200);
      });
    }
  }

  _addImageToLightbox(bhwi_image: BhwiImage) {
    this.current_image = bhwi_image;

    if (this.bhwi_options.options.lightbox_background) {
      this.dom_element.find('.bhwi-full-background').replaceWith(this.bhwi_helper.buildBackground(bhwi_image.standard));
    }
    this.dom_element.find('.bhwi-image-section').html(this.bhwi_helper.buildSlide(bhwi_image.link, bhwi_image.id, bhwi_image.standard));
    this.dom_element.find('.bhwi-text-section').html(this.bhwi_helper.buildDescription(bhwi_image.link, bhwi_image.author, bhwi_image.text, bhwi_image.created_time));

    this._addNavigationListener();

    if (this.dom_element.is(':hidden')) { this.dom_element.fadeIn(); }
  }
}

class BhwiImage {
  id: number;
  link: string;
  standard: string;
  low: string;
  thumbnail: string;
  author: string;
  text: string;
  created_time: number;

  constructor(id: number, link: string, standard: string, low: string, thumbnail: string, author: string, text: string, created_time: number) {
    this.id = id;
    this.link = link;
    this.standard = standard;
    this.low = low;
    this.thumbnail = thumbnail;
    this.author = author;
    this.text = text;
    this.created_time = created_time;
  }
}

class BhwiImages {
  images: Array<BhwiImage>;

  constructor() {
    this.images = new Array<BhwiImage>();
  }

  addImage(image: BhwiImage) {
    this.images.push(image);
  }

  addBuildImage(link: string, standard: string, low: string, thumbnail: string, author: string, text: string, created_time: number) {
    this.addImage(new BhwiImage(this.images.length, link, standard, low, thumbnail, author, text, created_time));
  }

  find(id: number) {
    return this.images[id];
  }

  preloadingImages() {
    var preload_img = new Image();
    jQuery.each(this.images, function (index: number, image: BhwiImage) {
      preload_img.src = image.low;
      preload_img.src = image.standard;
    });
  }
}

class BhwiUser {
  id: number;
  url: string;

  constructor(id: number, bhwi_options: BhwiOptions) {
    this.id = id;
    if ('bhwi' === bhwi_options.options.type) {
      this.url = this._buildBhwiUrl(bhwi_options.options.url);
    } else {
      this.url = this._buildInstagramUrl(bhwi_options.options.client_id);
    }
  }

  _buildInstagramUrl(client_id: string) {
    return 'https://api.instagram.com/v1/users/' + this.id + '/media/recent/?client_id=' + client_id + '&callback=?';
  }

  _buildBhwiUrl(url: string) {
    return url + this.id
  }
}

class Bhwi {
  bhwi_options: BhwiOptions;
  bhwi_helper: BhwiHelper;
  bhwi_user: BhwiUser;
  bhwi_images: BhwiImages;
  bhwi_silder: BhwiSlider;
  bhwi_timeline: BhwiTimeline;

  constructor(id: number, options: any) {
    this._basicVaildation(id, options);
    this.bhwi_options = new BhwiOptions(options);
    this.bhwi_helper = new BhwiHelper(this.bhwi_options.options.dom_element);
    this.bhwi_user = new BhwiUser(id, this.bhwi_options);
    this.bhwi_images = new BhwiImages;
    this._callApi();
  }

  _initBhwiSlider = () => {
    this.bhwi_silder = new BhwiSlider(this.bhwi_helper, this.bhwi_images, this.bhwi_options)
  };

  _initBhwiTimeline = () => {
    this.bhwi_timeline = new BhwiTimeline(this.bhwi_helper, this.bhwi_images, this.bhwi_options)
  };

  _decideInit = function () {
    switch(this.bhwi_options.options.form) {
      case 'slider':
        this._initBhwiSlider();
        break;
      default:
        this._initBhwiTimeline();
    }
    if (this.bhwi_options.options.lightbox) {
      new BhwiLightbox(this.bhwi_helper, this.bhwi_options, this.bhwi_images)
    }
  };

  _callApi() {
    jQuery.getJSON(this.bhwi_user.url).done((insta_posts) => {
      jQuery.each(insta_posts.data, (index, insta_posts) => {
        this.bhwi_images.addBuildImage(insta_posts.link, insta_posts.images.standard_resolution.url,
          insta_posts.images.low_resolution.url, insta_posts.images.thumbnail.url, insta_posts.user.username,
          this.bhwi_helper.nullTry (insta_posts.caption, 'text'), insta_posts.created_time);
        if (this.bhwi_options.options.preloading_images) { this.bhwi_images.preloadingImages(); }
      });
      this._decideInit();
    });
  }

  _basicVaildation(id: any, options: any) {
    if (id == null) { throw new Error('The param "id" is required.') }
    if (options == null) { throw new Error('The param "options" are required.') }
  }
}
