version=$(cat manifest.json | grep -e '"version":' | sed -e 's/\("version":.*"\)\(.*"\)/\2/' -e 's/"\|,\|\ //g')
fileName="Notifier_v${version}.zip"
destinationPath="./build/${fileName}"

zip -rv $destinationPath ./* -x create_version.sh -x build/\* -x *sublime*