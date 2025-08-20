module.exports = {
	readPackage(pkg) {
		if (pkg.name === 'inotify') {
			pkg.scripts = {};
		}
		return pkg;
	},
};
