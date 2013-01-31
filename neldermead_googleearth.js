/*

 Nelder-mead法により関数の局所最適解を求めるプログラム。
 そしてそれをGoogle earthに対して走らせる。
 表示はneldermead_googleearth.htmlで。
 頂点をベクトルとして考えることで球になる。（変化するのは面積だけだけど）
 
 debugはcの名残のオプションでデバッグできるよ。
 0は結果のみ表示。1は毎回のN+1個の座標と操作を表示。2は毎回の操作のみを表示。
 
*/



// C言語でいうところの#DEFINE
var N = 3;  // 昔の名残の次元数
var debug = 0;
var maximization = -1;  // -1で最大化。1で最小化
var r0 = 6378137;  // 地球の半径

// optionたち
var alpha = 1.0;  // Reflect
var beta = 2.0;  // Expand
var gamma = 0.5;  // Contract
var delta = 0.5;  // Reduction
var epsilon = 1000000;  // 終了条件の閾値
var loop_max = 100;  // google maps elevation api の制限　：　2,500回/日 && 512点/回 && 25,000点/日

// 面倒だからグローバルにしてしまった
var vertex = new Array();  // 単体の頂点[軸][頂点番号] N N
var i = 0; while(i < N){ vertex[i] = new Array(); i++ }
var cgrav = new Array();  // 重心 Center of Gravity[軸] N-1
var ref = new Array();  // Reflectした点[軸] N
var xpd = new Array();  // Expandした点[軸] N
var icnt = new Array();  // insideContractした点[軸] N
var ocnt = new Array();  // outsideContractした点[軸] N
var red1 = new Array();  // reductionした点１つめ[軸] N
var red2 = new Array();  // reductionした点2つめ[軸] N
var s;  // 単体の３頂点に向かう３本のベクトルがなす三角形の面積



// -------------- まずはgoogole api の準備 ----------------

var ge;  // earth
var range = 20000000.0;  // google earth のズーム 

var elevator0;  // elevatorのオブジェクト
var elevator1;
var elevator2;
var elevatorRef;
var elevatorXpd;
var elevatorOcnt;
var elevatorIcnt;
var elevatorRed1;
var elevatorRed2;

// パス表示用
var lastVertex0 = new Array();
i = 0; while(i < loop_max){ lastVertex0[i] = new Array(); i++ }
var n_lastVertex0 = -1;


google.load("earth", "1.x");



function initCB(instance) {
   ge = instance;
   ge.getWindow().setVisibility(true);
}



function failureCB(errorCode) {
	alert("earthのエラー.");
}



function init() {
	// earth
	google.earth.createInstance('map3d', initCB, failureCB);

	// 最初は初期点の設定
	setTimeout("setFirstPoint()", 500.0);
};



var checkVertexRef = 0;
var checkVertexXpd = 0;
var checkVertexOcnt = 0;
var checkVertexIcnt = 0;
var checkVertexRed1 = 0;
var checkVertexRed2 = 0;

var elevationResultCheck = function(){
	// 全部終了していたらnelderMead()実行
	if(checkVertexRef == 1 && checkVertexXpd == 1 && checkVertexOcnt == 1 && checkVertexIcnt == 1 && checkVertexRed1 == 1 && checkVertexRed2 == 1){
		checkVertexRef = 0;
		checkVertexXpd = 0;
		checkVertexOcnt = 0;
		checkVertexIcnt = 0;
		checkVertexRed1 = 0;
		checkVertexRed2 = 0;
		
		if(debug == 1){
			console.log("No." + n_loop);
			console.log("ref("+ ref[0] +", "+ ref[1] +", "+ ref[2] +")");
			console.log("xpd("+ xpd[0] +", "+ xpd[1] +", "+ xpd[2] +")");
			console.log("ocnt("+ ocnt[0] +", "+ ocnt[1] +", "+ ocnt[2] +")");
			console.log("icnt("+ icnt[0] +", "+ icnt[1] +", "+ icnt[2] +")");
			console.log("red1("+ red1[0] +", "+ red1[1] +", "+ red1[2] +")");
			console.log("red2("+ red2[0] +", "+ red2[1] +", "+ red2[2] +")");
		}
		
		//setTimeout("nelderMead()", 50.0);
		nelderMead();
	}
};



var getElevation = function() {
	// 頂点の候補全てについて標高を求める
	elevatorRef = new google.maps.ElevationService();
	var requestedLocationRef = new google.maps.LatLng(ref[0], ref[1]);
	var locationsRef = [];
	locationsRef.push(requestedLocationRef);
	var positionalRequestRef = {
		'locations': locationsRef
	}
	elevatorRef.getElevationForLocations(positionalRequestRef, function(results, status) {
		if (status == google.maps.ElevationStatus.OK) {
			if (results[0]) {
				ref[2] = results[0].elevation * maximization;
				checkVertexRef = 1;
				elevationResultCheck();
			} else {
				alert("No results found (ref)");
			}
		} else {
			alert("Elevation service failed due to: " + status);
		}
	});
	
	elevatorXpd = new google.maps.ElevationService();
	var requestedLocationXpd = new google.maps.LatLng(xpd[0], xpd[1]);
	var locationsXpd = [];
	locationsXpd.push(requestedLocationXpd);
	var positionalRequestXpd = {
		'locations': locationsXpd
	}
	elevatorXpd.getElevationForLocations(positionalRequestXpd, function(results, status) {
		if (status == google.maps.ElevationStatus.OK) {
			if (results[0]) {
				xpd[2] = results[0].elevation * maximization;
				checkVertexXpd = 1;
				elevationResultCheck();
			} else {
				alert("No results found (xpd)");
			}
		} else {
			alert("Elevation service failed due to: " + status);
		}
	});
	
	elevatorOcnt = new google.maps.ElevationService();
	var requestedLocationOcnt = new google.maps.LatLng(ocnt[0], ocnt[1]);
	var locationsOcnt = [];
	locationsOcnt.push(requestedLocationOcnt);
	var positionalRequestOcnt = {
		'locations': locationsOcnt
	}
	elevatorOcnt.getElevationForLocations(positionalRequestOcnt, function(results, status) {
		if (status == google.maps.ElevationStatus.OK) {
			if (results[0]) {
				ocnt[2] = results[0].elevation * maximization;
				checkVertexOcnt = 1;
				elevationResultCheck();
			} else {
				alert("No results found (ocnt)");
			}
		} else {
			alert("Elevation service failed due to: " + status);
		}
	});
	
	elevatorIcnt = new google.maps.ElevationService();
	var requestedLocationIcnt = new google.maps.LatLng(icnt[0], icnt[1]);
	var locationsIcnt = [];
	locationsIcnt.push(requestedLocationIcnt);
	var positionalRequestIcnt = {
		'locations': locationsIcnt
	}
	elevatorIcnt.getElevationForLocations(positionalRequestIcnt, function(results, status) {
		if (status == google.maps.ElevationStatus.OK) {
			if (results[0]) {
				icnt[2] = results[0].elevation * maximization;
				checkVertexIcnt = 1;
				elevationResultCheck();
			} else {
				alert("No results found (icnt)");
			}
		} else {
			alert("Elevation service failed due to: " + status);
		}
	});
	
	elevatorRed1 = new google.maps.ElevationService();
	var requestedLocationRed1 = new google.maps.LatLng(red1[0], red1[1]);
	var locationsRed1 = [];
	locationsRed1.push(requestedLocationRed1);
	var positionalRequestRed1 = {
		'locations': locationsRed1
	}
	elevatorRed1.getElevationForLocations(positionalRequestRed1, function(results, status) {
		if (status == google.maps.ElevationStatus.OK) {
			if (results[0]) {
				red1[2] = results[0].elevation * maximization;
				checkVertexRed1 = 1;
				elevationResultCheck();
			} else {
				alert("No results found (red1)");
			}
		} else {
			alert("Elevation service failed due to: " + status);
		}
	});
	
	elevatorRed2 = new google.maps.ElevationService();
	var requestedLocationRed2 = new google.maps.LatLng(red2[0], red2[1]);
	var locationsRed2 = [];
	locationsRed2.push(requestedLocationRed2);
	var positionalRequestRed2 = {
		'locations': locationsRed2
	}
	elevatorRed2.getElevationForLocations(positionalRequestRed2, function(results, status) {
		if (status == google.maps.ElevationStatus.OK) {
			if (results[0]) {
				red2[2] = results[0].elevation * maximization;
				checkVertexRed2 = 1;
				elevationResultCheck();
			} else {
				alert("No results found (red2)");
			}
		} else {
			alert("Elevation service failed due to: " + status);
		}
	});
};



var checkVertex0 = 0;
var checkVertex1 = 0;
var checkVertex2 = 0;

var elevationResultCheckFirst = function(){
	// 全部終了していたらnelderMead()実行
	if(checkVertex0 == 1 && checkVertex1 == 1 && checkVertex2 == 1){
		checkVertex0 = 0;
		checkVertex1 = 0;
		checkVertex2 = 0;
		
		// 初期点の出力
		var tmpHtml = document.getElementById("showbox_elevation").innerHTML
		i = 0;
		while(i < N){
			tmpHtml = "start point No."+ i +" ("+ vertex[0][i] +", "+ vertex[1][i] +", "+ vertex[2][i] +")<br>"+tmpHtml;
			i++;
		}
		document.getElementById("showbox_elevation").innerHTML = tmpHtml;
		
		calcObjFunc();
	}
};



var getElevationFirst = function() {
	// ３つの頂点について標高を求める
	elevator0 = new google.maps.ElevationService();
	var requestedLocation0 = new google.maps.LatLng(vertex[0][0], vertex[1][0]);
	var locations0 = [];
	locations0.push(requestedLocation0);
	var positionalRequest0 = {
		'locations': locations0
	}
	elevator0.getElevationForLocations(positionalRequest0, function(results, status) {
		if (status == google.maps.ElevationStatus.OK) {
			if (results[0]) {
				vertex[N-1][0] = results[0].elevation * maximization;
				checkVertex0 = 1;
				elevationResultCheckFirst();
			} else {
				alert("No results found (vertex0)");
			}
		} else {
			alert("Elevation service failed due to: " + status);
		}
	});
	
	elevator1 = new google.maps.ElevationService();
	var requestedLocation1 = new google.maps.LatLng(vertex[0][1], vertex[1][1]);
	var locations1 = [];
	locations1.push(requestedLocation1);
	var positionalRequest1 = {
		'locations': locations1
	}
	elevator1.getElevationForLocations(positionalRequest1, function(results, status) {
		if (status == google.maps.ElevationStatus.OK) {
			if (results[0]) {
				vertex[N-1][1] = results[0].elevation * maximization;
				checkVertex1 = 1;
				elevationResultCheckFirst();
			} else {
				alert("No results found (vertex1)");
			}
		} else {
			alert("Elevation service failed due to: " + status);
		}
	});
	
	elevator2 = new google.maps.ElevationService();
	var requestedLocation2 = new google.maps.LatLng(vertex[0][2], vertex[1][2]);
	var locations2 = [];
	locations2.push(requestedLocation2);
	var positionalRequest2 = {
		'locations': locations2
	}
	elevator2.getElevationForLocations(positionalRequest2, function(results, status) {
		if (status == google.maps.ElevationStatus.OK) {
			if (results[0]) {
				vertex[N-1][2] = results[0].elevation * maximization;
				checkVertex2 = 1;
				elevationResultCheckFirst();
			} else {
				alert("No results found (vertex2)");
			}
		} else {
			alert("Elevation service failed due to: " + status);
		}
	});
};



// -------------- ここからNelder-meadだぜベイベ ----------------

// 集計用
var n_loop = 0;
var n_ref = 0;
var n_xpd = 0;
var n_nxpd = 0;
var n_ocnt = 0;
var n_icnt = 0;
var n_red = 0;



// 配列x1に関して配列x[k]を同時にクイックソートする関数。構造体使いたくないときに使ってくれ
var qSort = function(x, left, right)
{
	var i, j;
	var pivot;
	
	i = left;  // ソートする配列の一番小さい要素の添字
	j = right; // ソートする配列の一番大きい要素の添字
	
	pivot = x[N-1][Math.round((left + right) / 2)];  // 基準値を配列の中央付近にとる
	
	while (1) {
		while (x[N-1][i] < pivot)
			i++;
		while (pivot < x[N-1][j])
			j--;
		if (i >= j)
			break;
		
		swap(x, N-1, i, j);
		
		var k = 0;
		while(k < N-1){
			swap(x, k, i, j);  // x1をスワップしたらx[k]もスワップ
			k++;
		}
		
		i++;
		j--;
	}
	
	if (left < i-1)  // 基準値の左に2以上要素があれば左の配列をQソートする
		qSort(x, left, i-1);
	if (j + 1 <  right)  // 基準値の右に2以上要素があれば右の配列をQソートする
		qSort(x, j + 1, right);
};



// qSortのswap
var swap = function(x, k, i, j)
{
	var tmp;
	
	tmp = x[k][i];
	x[k][i] = x[k][j];
	x[k][j] = tmp;
};



// デバッグモードの表示
var showProgress = function(name_step){
	console.log(name_step+"("+vertex[0][0]+","+vertex[1][0]+","+vertex[2][0]+"), "+"("+vertex[0][1]+","+vertex[1][1]+","+vertex[2][1]+"), "+"("+vertex[0][2]+","+vertex[1][2]+","+vertex[2][2]+")");
};



// ループ終わったらこの関数
var showResult = function(result){
	// earth ズーム
	var lookAt = ge.createLookAt('');
	lookAt.setLatitude(vertex[0][0]);
	lookAt.setLongitude(vertex[1][0]);
	lookAt.setRange(8000000.0);
	ge.getView().setAbstractView(lookAt);
	
	// earth 吹き出し
	/*var balloon = ge.createHtmlStringBalloon('');
	var resultText = "The elevation at this point is " + vertex[N-1][0]*maximization + " meters.";
	if(result == -1){
		resultText += " (reached loop_max)";
	}
	balloon.setContentString(resultText);
	ge.setBalloon(balloon);*/
	
	// placemark
	var placemark = ge.createPlacemark('');
	placemark.setName("optimalvalue : "+ vertex[N-1][0]*maximization +" meters. ("+ n_loop +" loops)");
	var style = ge.createStyle(''); //create a new style
	style.getIconStyle().setScale(4.0);
	placemark.setStyleSelector(style); //apply the style to the placemark
	var point = ge.createPoint('');
	point.setLatitude(vertex[0][0]);
	point.setLongitude(vertex[1][0]);
	placemark.setGeometry(point);
	ge.getFeatures().appendChild(placemark);

	// console
	console.log("Optimal value is "+vertex[N-1][0]+"("+vertex[0][0]+", "+vertex[1][0]+")");
	console.log("Reflect : "+ n_ref +", Expand : "+ n_xpd +", NotExpand : "+ n_nxpd +", o_Contract : "+ n_ocnt +", i_Contract : "+ n_icnt +", Reduction : "+ n_red +"<br>");
};



// 単体の面積を計算する ベクトルとして考えることで球になる！
var calcS = function()
{
	var s = 0;

	var a = new Array();  // x2-x0のベクトル
	a[0] = r0*Math.cos(vertex[0][2])*Math.cos(vertex[1][2]) - r0*Math.cos(vertex[0][0])*Math.cos(vertex[1][0]);
	a[1] = r0*Math.sin(vertex[0][2])*Math.sin(vertex[1][2]) - r0*Math.sin(vertex[0][0])*Math.sin(vertex[1][0]);
	a[2] = r0*Math.sin(vertex[1][2]) - r0*Math.sin(vertex[1][0]);
	
	var b = new Array();  // x1-x0のベクトル
	b[0] = r0*Math.cos(vertex[0][1])*Math.cos(vertex[1][1]) - r0*Math.cos(vertex[0][0])*Math.cos(vertex[1][0]);
	b[1] = r0*Math.sin(vertex[0][1])*Math.sin(vertex[1][1]) - r0*Math.sin(vertex[0][0])*Math.sin(vertex[1][0]);
	b[2] = r0*Math.sin(vertex[1][1]) - r0*Math.sin(vertex[1][0]);
	
	var a2b2 = (a[0]*a[0] + a[1]*a[1] + a[2]*a[2]) * (b[0]*b[0] + b[1]*b[1] + b[2]*b[2]);  // |a|^2*|b|^2
	var ab = (a[0]*b[0] + a[1]*b[1] + a[2]*b[2]);  // a.b
	s = Math.pow((a2b2 - ab*ab), 1/2) / 2;
	
	//console.log("calcS: "+s);
	return s;
};



// getElevation（）に投げる前にきれいにしてやる関数
var prepareVertex = function(x){
	var preparedVertex = new Array();
	
	// 地図内に収まるように修正
	preparedVertex[0] = x[0];
	// JSのモジュロむかつく。fuck.
	if(x[1] > 180){
		preparedVertex[1] = ((x[1] + 180) % 360) - 180;
	}else if(x[1] < -180){
		preparedVertex[1] = ((x[1] + 180) % 360) + 360 - 180;
	}else{
		preparedVertex[1] = x[1];
	}
	
	// xが収まっていないときはめんどくさい
	if(x[0] < -90 || x[0] > 90){
		if(x[0] < -90){
			preparedVertex[0] = -90 + (-(x[0] + 90)) % 180;
		}else if(x[0] > 90){
			preparedVertex[0] = 90 - (x[0] + 90) % 180;
		}
		
		// yの操作は共通
		if(preparedVertex[1] >= 0){
			preparedVertex[1] -= 180;
		}else{
			preparedVertex[1] += 180;
		}
	}
	
	// 文字数制限とかあるし、google maps api に投げる前に有効数字８桁で四捨五入
	var tmpVertex;
	var i = 0;
	while(i < N-1){
		tmpVertex = preparedVertex[i] * 100000000;
		x[i] = Math.round(tmpVertex) / 100000000;
		i++;
	}
};



// HTMLに表示してやる関数
var showHtml = function(){
	// ログの表示
	var tmpHtml = document.getElementById("showbox_elevation").innerHTML
	tmpHtml = "No."+n_loop+" : "+vertex[N-1][0]*maximization+" ("+vertex[0][N-1]+", "+vertex[1][N-1]+")<br>"+tmpHtml;
	document.getElementById("showbox_elevation").innerHTML = tmpHtml;
	
	// earth パン
	var lookAt = ge.createLookAt('');
	lookAt.setLatitude(vertex[0][0]);
	lookAt.setLongitude(vertex[1][0]);
	
	// earth ズーム
	var norm_a = Math.pow(Math.pow(vertex[0][2]-vertex[0][0], 2) + Math.pow(vertex[1][2]-vertex[1][0], 2), 1/2);
	var norm_b = Math.pow(Math.pow(vertex[0][1]-vertex[0][0], 2) + Math.pow(vertex[1][1]-vertex[1][0], 2), 1/2);
	if(norm_a > norm_b){
		var bigger_ab = norm_a;
	}else{
		var bigger_ab = norm_b;
	}
	range = bigger_ab*500000;
	if(range > 10000000){
		range = 10000000;
	}
	lookAt.setRange(range);
	ge.getView().setAbstractView(lookAt);
	
	// earth 三角形
	var polygonPlacemark = ge.createPlacemark('');
	var polygon = ge.createPolygon('');
	polygonPlacemark.setGeometry(polygon);
	polygon.setAltitudeMode(ge.ALTITUDE_CLAMP_TO_SEA_FLOOR);

	var outer = ge.createLinearRing('');
	outer.getCoordinates().pushLatLngAlt(vertex[0][0], vertex[1][0], 0);
	outer.getCoordinates().pushLatLngAlt(vertex[0][1], vertex[1][1], 0);
	outer.getCoordinates().pushLatLngAlt(vertex[0][2], vertex[1][2], 0);
	polygon.setOuterBoundary(outer);
	
	polygonPlacemark.setStyleSelector(ge.createStyle(''));
	var lineStyle = polygonPlacemark.getStyleSelector().getLineStyle();
	lineStyle.setWidth(3);  // 2
	lineStyle.getColor().set('ff88ffff');  // aabbggrr 8088f0f0
	var polyStyle = polygonPlacemark.getStyleSelector().getPolyStyle();
	polyStyle.getColor().set('1088ffff');  // aabbggrr 2088f0f0
	ge.getFeatures().appendChild(polygonPlacemark);
	
	/*
	// earth パス
	if(lastVertex0[0] != null && lastVertex0[0] != vertex[0][0] && lastVertex0[1] != vertex[1][0]){
		drawPath(lastVertex0[0], lastVertex0[1], vertex[0][0], vertex[1][0]);
	}
	lastVertex0[0] = vertex[0][0];
	lastVertex0[1] = vertex[1][0];
	*/
	
	// 最良点が更新されたらlastVertex0に追加
	if(n_lastVertex0 == -1 || lastVertex0[n_lastVertex0][0] != vertex[0][0] && lastVertex0[n_lastVertex0][1] != vertex[1][0]){
		n_lastVertex0++;
		lastVertex0[n_lastVertex0][0] = vertex[0][0];
		lastVertex0[n_lastVertex0][1] = vertex[1][0];
		console.log("Insert lastVertex."+n_lastVertex0+": "+lastVertex0[n_lastVertex0][0]+", "+lastVertex0[n_lastVertex0][1]);
	}
	
	// 問答無用に毎回描画
	if(n_lastVertex0 > 0){
		var polygonPlacemarkPath = ge.createPlacemark('');
		var polygonPath = ge.createPolygon('');
		polygonPlacemarkPath.setGeometry(polygonPath);
		polygonPath.setAltitudeMode(ge.ALTITUDE_CLAMP_TO_SEA_FLOOR);

		var outerPath = ge.createLinearRing('');
		var i = 0;
		while(i < n_lastVertex0 + 1){
			outerPath.getCoordinates().pushLatLngAlt(lastVertex0[i][0], lastVertex0[i][1], 0);
			i++;
		}
		i-=2;
		while(i > 0){
			outerPath.getCoordinates().pushLatLngAlt(lastVertex0[i][0], lastVertex0[i][1], 0);
			i--;
		}
		polygonPath.setOuterBoundary(outerPath);

		polygonPlacemarkPath.setStyleSelector(ge.createStyle(''));
		var lineStylePath = polygonPlacemarkPath.getStyleSelector().getLineStyle();
		lineStylePath.setWidth(8);  // 4
		lineStylePath.getColor().set('ff4040ff');  // aabbggrr ff4040ff
		ge.getFeatures().appendChild(polygonPlacemarkPath);
	}
};



// 初期点の設定をする関数
var setFirstPoint = function(){
	var area = new Array();  // 初期点の設定範囲[軸][最大・最小] N-1 2
	i = 0; while(i < N-1){ area[i] = new Array(); i++ }
	
	// 初期点の範囲の設定
	area[0][0] = -90; area[0][1] = 90;  // x[i]の最大値と最小値
	area[1][0] = -180; area[1][1] = 180;  // x[i]の最大値と最小値
	
	// ランダムで初期点の設定
	i = 0;
	while(i < N){  // 頂点
		var t = 0;
		while(t < N-1){  // 軸
			vertex[t][i] = (Math.random() * (area[t][1] - area[t][0])) - area[t][1];
			t++;
		}
		i++;
	}
	
	// 一定以上の面積がなければやりなおし！
	if(calcS() < 10000000000000){
		setFirstPoint();
	}else{
		getElevationFirst();
	}
		
	return 0;
};



// 初期点の設定、終了条件のチェック、頂点候補の列挙を行い、getElevation()に投げる関数
var calcObjFunc = function(){
	// vertex[N-1][]について2次元配列vertex[][]をソートする
	qSort(vertex, 0, N-1);
	
	s = calcS();
	
	showHtml();
	
	// 終了条件のチェック
	if( s < epsilon){
		console.log("calcS : "+s);
		showResult(1);
		return 1;
	}
	
	
	// ------- Step1 (Reflect) --------
	// N番目以外に関する重心を求める
	var tmp_x = new Array();  // N-1
	i = 0; while(i < N-1){ tmp_x[i] = 0; i++; }
	
	i = 0;
	while(i < N-1){  // 頂点番号
		var t = 0;
		while(t < N-1){  // 軸
			tmp_x[t] += vertex[t][i];
			t++;
		}
		i++;
	}
		
	i = 0;
	while(i < N-1){
		cgrav[i] = tmp_x[i] / (N-1);  // Worst point以外の点の重心
		i++;
	}
	
	i = 0;
	while(i < N-1){ ref[i] = cgrav[i] + alpha * (cgrav[i] - vertex[i][N-1]); i++; }
	i = 0;
	while(i < N-1){ xpd[i] = cgrav[i] + beta * (ref[i] - cgrav[i]); i++; }
	i = 0;
	while(i < N-1){ ocnt[i] = cgrav[i] + gamma * (cgrav[i] - vertex[i][N-1]); i++; }
	i = 0;
	while(i < N-1){ icnt[i] = cgrav[i] - gamma * (cgrav[i] - vertex[i][N-1]); i++; }
	i = 0;
	while(i < N-1){	red1[i] = vertex[i][0] + delta * (vertex[i][1] - vertex[i][0]); i++; }
	i = 0;
	while(i < N-1){	red2[i] = vertex[i][0] + delta * (vertex[i][2] - vertex[i][0]); i++; }

	// 投げる前に整えてやる
	prepareVertex(ref);
	prepareVertex(xpd);
	prepareVertex(ocnt);
	prepareVertex(icnt);
	prepareVertex(red1);
	prepareVertex(red2);
	
	// getElevation()
	setTimeout('getElevation()', 200);
};



// Nelder-Mead法を実行する関数
var nelderMead = function()
{	
	// ------- すべての頂点候補が存在する状態で条件分岐 --------

	// ------- Step2 --------
	if(ref[N-1] < vertex[N-1][N-2]){
	
		// ----- Case2 (Expand) ------
		if(ref[N-1] < vertex[N-1][0]){
			if(xpd[N-1] <= ref[N-1]){
				i = 0;
				while(i < N){
					vertex[i][N-1] = xpd[i];
					i++;
				}
					
				showProgress("Expand");
				n_xpd++;
			}else{
				i = 0;
				while(i < N){
					vertex[i][N-1] = ref[i];
					i++;
				}
					
				showProgress("Not Expand");
				n_nxpd++;
			}
		}else{	
			// ----- Case1 (Accept Reflect) ------
			i = 0;
			while(i < N){
				vertex[i][N-1] = ref[i];
				i++;
			}
			showProgress("Reflect");
			n_ref++;
		}
	}
		
	// ----- Case3 (Contract) ------
	else{  // if(ref[N-1] >= vertex[N-1][N-2]){
		var outside_flg = 0;
		var inside_flg = 0;
		
		// inside, outsideの決定
		if(ref[N-1] < vertex[N-1][N-1]){
			// outside
			outside_flg = 1;
		}else{
			// inside
			inside_flg = 1;
		}
		
		if((outside_flg == 1 && ocnt[N-1] <= ref[N-1]) || (inside_flg == 1 && icnt[N-1] < vertex[N-1][N-1])){
			if(outside_flg == 1){
				i = 0;
				while(i < N){
					vertex[i][N-1] = ocnt[i];
					i++;
				}
				showProgress("OutsideContract");
				n_ocnt++;
			}else if(inside_flg == 1){
				i = 0;
				while(i < N){
					vertex[i][N-1] = icnt[i];
					i++;
				}
				showProgress("InsideContract");
				n_icnt++;
			}
			
		}else{
			// ------- Step3 (Reduction) --------
			i = 0;
			while(i < N){  // 軸
				vertex[i][1] = red1[i];
				i++;
			}
			
			i = 0;
			while(i < N){  // 軸
				vertex[i][2] = red2[i];
				i++;
			}
			
			showProgress("Reduction");
			n_red++;
		}
	}
	
	if(n_loop < loop_max){
		n_loop++;
		//setTimeout("calcObjFunc()", 200);
		calcObjFunc();
	}else{
		showResult(-1);
		console.log("Reached loop_max.");
		return -1;
	}
	
	return 0;
};