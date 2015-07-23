//helper isEmpty()
var isEmpty = function( val ) {

    // test results
    //---------------
    // []        true, empty array
    // {}        true, empty object
    // null      true
    // undefined true
    // ""        true, empty string
    // ''        true, empty string
		// ' '			 true, not text
    // 0         false, number
    // true      false, boolean
    // false     false, boolean
    // Date      false
    // function  false

        if (val === undefined)
        return true;

    if (typeof (val) == 'function' || typeof (val) == 'number' || typeof (val) == 'boolean' || Object.prototype.toString.call(val) === '[object Date]')
        return false;

    if (val == null || val.length === 0)        // null or 0 length array
        return true;

    if (typeof (val) == "object") {
        // empty object

        var r = true;

        for (var f in val)
            r = false;

        return r;
    }

		if (typeof (val) == "string") {
			
				if (val.trim().length === 0)        // 0 length string with no spaces
        return true;
		}
		
    return false;
}

var app = angular.module("sampleApp", ["firebase"]);
app.controller("SampleCtrl", function($scope, $firebaseArray, $firebaseObject) {
	var firebaseUrl = "https://master-makaroni-6352.firebaseio.com/";
  var devicesRef = new Firebase(firebaseUrl + "fsdevice");
  var entityRef = new Firebase(firebaseUrl + "fsentity");
	var linksRef = new Firebase(firebaseUrl + "fslink");
	
	$scope.filesystem = {
		breadcrumb : [],
		parents : [],
		children : [],
		folder : {},
		device : {},
		data : {
			devices : [],
			items : [],
			links : []
		}
	};
	$scope.newDevice = {};
	$scope.newFolder = {};
	$scope.newFile = {};
	
	$scope.dev = false; // on dev true werden dev infos auf seite angezeigt
	
	
  $scope.filesystem.data.devices = $firebaseArray(devicesRef);
  $scope.filesystem.data.items = $firebaseObject(entityRef);
  $scope.filesystem.data.links = $firebaseObject(linksRef);
	
	$scope.filesystem.clear = function(){
		$scope.filesystem.breadcrumb = [];
		$scope.filesystem.parents = [];
		$scope.filesystem.folder = {};
		$scope.filesystem.children = [];
	}
	
	//fixxx funktion für breadcrumb
	
	//fixxx delete functions
	
	//fixxx edit options => title
	
	
	
	$scope.filesystem.selectDevice = function(device) {
		console.log("selectDevice(device)",device);
		
		
		$scope.filesystem.clear();
		$scope.filesystem.device = {};
		
		linksRef.orderByChild("parent").startAt(device.$id).endAt(device.$id).on("value", function(snap) {
			
			if(snap.exists()){
				snap.forEach(function(linkSnap) {
					console.log("selectDevice(device) query",linkSnap.val());
					$scope.filesystem.selectFolder({$id: linkSnap.val().entity});
				});
			} else {
				console.warn("selectDevice(device) query" +" no root folder available", device);
			}
		});
	};
	
	$scope.filesystem.selectFolder = function(folder){
		console.log("selectFolder(folder)",folder);
		
		$scope.filesystem.clear(); // filesystem browser neu füllen
		
		entityRef.child(folder.$id).on("value", function(folderSnap){ // folder laden
			if(folderSnap.exists() ) {
				$scope.filesystem.folder = folderSnap.val();
				$scope.filesystem.folder.$id = folderSnap.key();
				
				linksRef.child($scope.filesystem.folder.link).once("value", function(linkSnap) { // link zum folder laden
					if(linkSnap.exists()){
					
						$scope.filesystem.link = linkSnap.val();
						$scope.filesystem.link.$id = linkSnap.key();
						
					console.debug("linkSnap", linkSnap.exists(), linkSnap, linkSnap.val());

					// push parent folders
						if($scope.filesystem.link.ptype != "fsdevice"){
							$scope.filesystem.parents.push($firebaseObject(entityRef.child($scope.filesystem.link.parent)));
						}
						
						// push child folders & files
						if(typeof $scope.filesystem.link.children != 'undefined' && $scope.filesystem.link.children != false){
							var children = Object.keys($scope.filesystem.link.children);
							console.debug("children", children);
							for (index = 0, len = children.length; index < len; ++index) {
								$scope.filesystem.children.push($firebaseObject(entityRef.child(children[index])));
							}
						}
					
					} else {
						console.error("Folder", folder.$id, "doesn't has link", $scope.filesystem.folder.link);
					}
				
				});
				
			} else {
				console.error("no folder with id: ", folder.$id);
			}
			
		});
		
	};
	
	$scope.pushDevice = function($event){
		console.log("pushDevice($event) valid", !isEmpty($scope.newDevice.title));
		$event.stopPropagation();
		
		if(isEmpty($scope.newDevice.title)){
			return true
		}
		
		// get new push keys
		var newDeviceRef = devicesRef.push();
		var newFolderRef = entityRef.push();
		var newLinkRef = linksRef.push();
		
		// prepare saving datas
		var device = $scope.newDevice;
		device.title = device.title.trim();
		var folder = {
			type: "folder",
			title: device.title,
			link: newLinkRef.key()
		};
		var link = {
			parent: newDeviceRef.key(),
			ptype: "fsdevice",
			children: false,
			entity: newFolderRef.key()
		};
		
		console.log("pushDevice()", device, folder, link);
		
		// saving data
		newDeviceRef.set(device);
		newFolderRef.set(folder);
		newLinkRef.set(link);
		
		
		// clear form
		$scope.newDevice = {}; 
		return true;
	}
	
	$scope.pushFolder = function($event){
		console.log("pushFolder($event) valid", !isEmpty($scope.filesystem.folder.$id), !isEmpty($scope.newFolder.title));
		
		$event.stopPropagation();
		if(isEmpty($scope.filesystem.folder.$id) || isEmpty($scope.newFolder.title)){
			return true;
		}
		
		// get new push keys
		var newFolderRef = entityRef.push();
		var newLinkRef = linksRef.push();
		
		var parentLinkRef = linksRef.child($scope.filesystem.link.$id);
		
		// prepare saving datas
		var folder = $scope.newFolder;
		folder.title = folder.title.trim();
		folder.type = "folder";
		folder.link = newLinkRef.key();
		var link = {
			parent: $scope.filesystem.folder.$id,
			children: false,
			entity: newFolderRef.key()
		};
		console.log("pushFolder()", folder, link, newFolderRef.key());
		
		// saving data
		newFolderRef.set(folder);
		newLinkRef.set(link);
		parentLinkRef.child("children").child(newFolderRef.key()).set(true); // add new child entity to parent link
		
		
		$scope.newFolder = {}; // clear form
		return true;
	}
	
	$scope.pushFile = function($event){
		console.log("pushFile($event) valid", !isEmpty($scope.filesystem.folder.$id), !isEmpty($scope.newFile.title));
		
		$event.stopPropagation();
		if(isEmpty($scope.filesystem.folder.$id) || isEmpty($scope.newFile.title)){
			return true;
		}
		
		// get new push keys
		var newFileRef = entityRef.push();
		var newLinkRef = linksRef.push();
		
		var parentLinkRef = linksRef.child($scope.filesystem.link.$id);
		
		// prepare saving datas
		var file = $scope.newFile;
		file.title = file.title.trim();
		file.type = "file";
		file.link = newLinkRef.key();
		var link = {
			parent: $scope.filesystem.folder.$id,
			children: false,
			entity: newFileRef.key()
		};
		console.log("pushFile()", file, link, newFileRef.key());
		
		// saving data
		newFileRef.set(file);
		newLinkRef.set(link);
		parentLinkRef.child("children").child(newFileRef.key()).set(true); // add new child entity to parent link
		
		
		$scope.newFile = {}; // clear form
		return true;
	}
	
	console.log("app.controller('SampleCtrl') ready");
});