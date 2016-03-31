/**
 * Created by jrain on 16/1/29.
 */
var app = {
    animateHideShow:function(willHide,willShow) {
        $(willHide).css({'-webkit-animation-duration': '0.5s','-webkit-animation-delay': '0.01s'});
        $(willShow).css({'-webkit-animation-duration': '0.01s','-webkit-animation-delay': '0.01s'});

        $(willHide).addClass('animated slideOutLeft');

        $(willHide).one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend',
            function(){
                $(willHide).hide();
                $(willHide).removeClass('animated slideOutLeft');
                $(willShow).show();
                $(willShow).addClass('animated fadeIn');
            });
        $(willShow).one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend',
            function(){
                $(willShow).removeClass('animated fadeIn');
            });
    }
}
