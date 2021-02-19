function polymerClone (element) {
	var newElement = element.cloneNode(true);

	// Copying polymer elements is difficult
	for (var i in element.properties) {
		newElement[i] = element[i]
	}

	return newElement;
}

document.onload = function () {
	var amRedirectingToFeed = localStorage.getItem("amRedirectingToFeed");
	if ((window.location.href === "https://www.youtube.com/feed/subscriptions" || window.location.href === "http://www.youtube.com/feed/subscriptions") && amRedirectingToFeed == "1") {
		// Pretend feed was opened
		localStorage.setItem("amRedirectingToFeed", "0");
		window.history.pushState("", "", "/feed/feed");

		// For some cursed reason, multiple containers are named items
		var possibleContainers = document.querySelectorAll("#items");
		var videosContainer;
		if (possibleContainers.length == 7) {
			videosContainer = possibleContainers[0];
		} else if (possibleContainers.length == 11) {
			videosContainer = possibleContainers[4];
		} else if (possibleContainers.length == 12) {
			videosContainer = possibleContainers[8];
		}
		var templateVideo         = videosContainer.firstElementChild;
		var templateVerifiedBadge = document.getElementsByClassName("badge-style-type-verified")[0];

		// TODO will obtain data later
		// Video ids
		var videosToPresent = [{
			id: "dHsj51Db1Ec",
			title: "phone minecraft",
			length: "12:32",
			creator: "EazySpeezy",
			creatorchannel: "https://www.youtube.com/c/EazySpeezy",
			verified: true,
			// UNIX timestamp of when the person interacted with it
			dateadded: 1612841880,
			// People who interacted with it
			friends: [{
				// Person who interacted
				friend: "Wifies",
				// URL of person who interacted with it
				friendchannel: "https://www.youtube.com/c/WifiesMC"
			}],
			// Action that resulted in a recommendation
			action: "Liked",
			// What action resulted in a recommendation
			// Date and views are essentially impossible to obtain without an API key
			// As such, they are ignored
		}];

		videosContainer.textContent = "";

		var test;

		videosToPresent.forEach(function (video) {
			var newVideo = polymerClone (templateVideo);

			videosContainer.appendChild(newVideo);

			var thumbnail = "https://i.ytimg.com/vi/" + video.id + "/hqdefault.jpg";
			var url       = "https://youtube.com/watch?v=" + video.id;

			newVideo.firstElementChild.children[0].firstElementChild.href                                                                                                                                    = url;
			newVideo.firstElementChild.children[0].firstElementChild.search                                                                                                                                  = "?v=" + video.id;
			newVideo.firstElementChild.children[1].firstElementChild.children[0].children[1]["aria-label"]                                                                                                   = video.title;
			newVideo.firstElementChild.children[0].firstElementChild.firstElementChild.firstElementChild.src                                                                                                 = thumbnail;
			newVideo.firstElementChild.children[1].firstElementChild.children[0].children[1].title                                                                                                           = video.title;
			newVideo.firstElementChild.children[1].firstElementChild.children[0].children[1].innerHTML                                                                                                       = video.title;
			newVideo.firstElementChild.children[1].firstElementChild.children[0].children[1].href                                                                                                            = url;
			newVideo.firstElementChild.children[1].firstElementChild.children[1].firstElementChild.children[0].firstElementChild.children[0].firstElementChild.firstElementChild.firstElementChild.innerHTML = video.creator;
			newVideo.firstElementChild.children[1].firstElementChild.children[1].firstElementChild.children[0].firstElementChild.children[0].firstElementChild.firstElementChild.firstElementChild.href      = video.creatorchannel;

			// TODO
			//if (video.verified) {
			//	firstElementChild.firstElementChild.children[1].firstElementChild.children[1].firstElementChild.children[0].firstElementChild.children[1] = polymerClone (templateVerifiedBadge);
			//} else {
			//	firstElementChild.firstElementChild.children[1].firstElementChild.children[1].firstElementChild.children[0].firstElementChild.children[1].innerHTML = "";
			//}

			newVideo.firstElementChild.children[1].firstElementChild.children[1].firstElementChild.children[1].children[0].innerHTML = video.action + " by " + video.friends.map(item => `<a href="${item.friendchannel}">${item.friend}</a>`).join(", ");

			var unneededViewsContainer = newVideo.firstElementChild.children[1].firstElementChild.children[1].firstElementChild.children[1];

			if (unneededViewsContainer.children.length == 2) {
				unneededViewsContainer.removeChild(unneededViewsContainer.children[1]);
			}

			newVideo.firstElementChild.children[0].firstElementChild.children[1].firstElementChild.children[1].innerHTML = "\n  " + video.length + "\n";

			test = newVideo;
		});
	}

	var sidebarButtonIsLoaded = false;
	var looper                = setInterval (function () {
        var sidebarContainer = document.getElementById("section-items");

        if (sidebarContainer) {
            clearInterval (looper);
            sidebarButtonIsLoaded = true;

            var newFeedElement = polymerClone (sidebarContainer.firstElementChild);

            sidebarContainer.insertBefore(newFeedElement, sidebarContainer.children[1]);

            newFeedElement.firstElementChild.title = "Feed";
            newFeedElement.firstElementChild.href  = "/feed/feed"; // TODO

            newFeedElement.firstElementChild.firstElementChild.children[2].innerHTML                         = "Feed";
            newFeedElement.firstElementChild.firstElementChild.firstElementChild.firstElementChild.outerHTML = `
			<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet" focusable="false" style="pointer-events: none; display: block; width: 100%; height: 100%;" class="style-scope yt-icon" height="100%" width="100%" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" enable-background="new 0 0 200 200" xml:space="preserve">
				<rect x="82.833" y="31.855" width="67.469" height="6.134"></rect>
				<rect x="82.833" y="44.123" width="21.468" height="6.134"></rect>
				<rect x="46.032" y="31.855" width="21.468" height="21.468"></rect>
				<rect x="82.833" y="145.326" width="67.469" height="6.134"></rect>
				<rect x="82.833" y="157.594" width="21.468" height="6.134"></rect>
				<rect x="46.032" y="145.326" width="21.468" height="21.468"></rect>
				<path d="M168.429,7H30.887C24.559,7,19,12.452,19,18.783v160.461C19,185.575,24.559,191,30.887,191h137.542  c6.327,0,11.571-5.425,11.571-11.756V18.783C180,12.452,174.756,7,168.429,7z M168,19v44H31V19H168z M83,95v-6h67v6H83z M104,101v6  H83v-6H104z M67,89v21H46V89H67z M31,179v-46h137v46H31z"></path>
			</svg>
				`;

            newFeedElement.onclick = function () {
                localStorage.setItem("amRedirectingToFeed", "1");
                window.location.href = "/feed/subscriptions";
            };
        }
    }, 30);
};