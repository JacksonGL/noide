// Author: Liang Gong

(function() {
	filter = {
		isRetain: function(name) {
			if (endsWith(name, '_jalangi_.js')) {
				return false;
			} else if (endsWith(name, '_jalangi_sourcemap.js')) {
				return false;
			} else if (endsWith(name, 'time.txt')) {
				return false;
			} else if (endsWith(name, '.DS_Store')) {
				return false;
			}
			return true;
		}
	}

	function endsWith(str1, str2) {
		if (typeof str1 === 'string') {
			if (str1.substring(str1.lastIndexOf(str2), str1.length) === str2) {
				return true;
			}
		}
		return false;
	}

	module.exports = filter;
})();