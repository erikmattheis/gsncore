﻿(function (angular, Gsn, undefined) {
  'use strict';
  var serviceId = 'gsnDfp';
  angular.module('gsn.core').service(serviceId, ['$rootScope', 'gsnApi', 'gsnStore', 'gsnProfile', '$sessionStorage', '$window', '$timeout', '$location', gsnDfp]);

  function gsnDfp($rootScope, gsnApi, gsnStore, gsnProfile, $sessionStorage, $window, $timeout, $location) {
    var service = {
      forceRefresh: false,
      hasShoppingList: false,
      actionParam: null
    };

    $rootScope.$on('gsnevent:shoppinglistitem-updating', function (event, shoppingList, item) {
      var currentListId = gsnApi.getShoppingListId();
      if (shoppingList.ShoppingListId == currentListId) {
        var cat = gsnStore.getCategories()[item.CategoryId];
        Gsn.Advertising.addDept(cat.CategoryName);
        service.actionParam = {evtname: event.name, dept: cat.CategoryName, pdesc: item.Description, pcode: item.Id, brand: item.BrandName};
        $timeout(doRefresh, 50);
      }
    });

    $rootScope.$on('gsnevent:shoppinglist-loaded', function (event, shoppingList, item) {
      // load all the ad depts
      var items = gsnProfile.getShoppingList().allItems();
      var categories = gsnStore.getCategories();

      angular.forEach(items, function (item, idx) {
        if (gsnApi.isNull(item.CategoryId, null) === null) return;

        if (categories[item.CategoryId]) {
          var newKw = categories[item.CategoryId].CategoryName;
          Gsn.Advertising.addDept(newKw);
        }
      });

      service.actionParam = {evtname: event.name, evtcategory: gsnProfile.getShoppingListId() };
    });

    $rootScope.$on('$locationChangeSuccess', function (event, next) {
      $timeout(function() {
        var currentPath = angular.lowercase(gsnApi.isNull($location.path(), ''));
        gsnProfile.getProfile().then(function(p){
          var isLoggedIn = gsnApi.isLoggedIn();

          Gsn.Advertising.setDefault({ 
            page: currentPath, 
            storeid: gsnApi.getSelectedStoreId(), 
            consumerid: gsnProfile.getProfileId(), 
            isanon: !isLoggedIn,
            loyaltyid: p.response.ExternalId
          });
        });
        service.forceRefresh = true;
      }, 50);
    });

    $rootScope.$on('gsnevent:loadads', function (event, next) {
      service.actionParam = {evtname: event.name};
      $timeout(doRefresh, 50);
    });

    $rootScope.$on('gsnevent:digitalcircular-pagechanging', function (event, data) {
      service.actionParam = {evtname: event.name, evtcategory: data.circularIndex, pdesc: data.pageIndex};
      $timeout(doRefresh, 50);

      if (angular.element($window).scrollTop() > 140) {
        $window.scrollTo(0, 120);
      }
    });

    init();

    return service;

    // initialization
    function init() {
      if (service.isIE) {
        Gsn.Advertising.minSecondBetweenRefresh = 15;
      }
    }

    // attempt to update network id
    function updateNetworkId() {
      gsnStore.getStore().then(function (rst) {
        if (service.store != rst) {
          var baseNetworkId;

          if (rst) {
            baseNetworkId = '/' + rst.City + '-' + rst.StateName + '-' + rst.PostalCode + '-' + rst.StoreId;
            baseNetworkId = baseNetworkId.replace(/(undefined)+/gi, '').replace(/\s+/gi, '');
          }
          Gsn.Advertising.gsnNetworkStore = baseNetworkId;
        }
      });
    }

    // refresh method
    function doRefresh() {
      updateNetworkId();

      // targetted campaign
      if (parseFloat(gsnApi.isNull($sessionStorage.GsnCampaign, 0)) <= 0) {

        doCampaignRefresh();
        // don't need to continue with the refresh since it's being patched through get campaign above
        return;
      }

      Gsn.Advertising.refresh(service.actionParam, service.forceRefresh);
      service.forceRefresh = false;
    }

    // campaign refresh
    function doCampaignRefresh()
    {
      $sessionStorage.GsnCampaign = gsnApi.getProfileId();

      // try to get campaign
      gsnProfile.getCampaign().then(function (rst) {
        if (rst.success) {
          angular.forEach(rst.response, function (v, k) {
            Gsn.Advertising.addDept(v.Value);
          });
        }
        Gsn.Advertising.refresh(service.actionParam, service.forceRefresh);
        service.hasShoppingList = false;
        service.forceRefresh = false;
      });
    }

  }
})(angular, window.Gsn);

