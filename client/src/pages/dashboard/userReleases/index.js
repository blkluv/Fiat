import React, { useEffect, useState } from 'react';
import { fetchUserReleases, fetchUserReleasesFavCounts, fetchUserReleasesPlayCounts } from 'features/releases';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import Button from 'components/button';
import { Link } from 'react-router-dom';
import Spinner from 'components/spinner';
import UserRelease from './userRelease';
import axios from 'axios';
import { faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import styles from './userReleases.module.css';

function UserReleases() {
  const dispatch = useDispatch();
  const { userReleases, favCounts, playCounts } = useSelector(state => state.releases, shallowEqual);
  const [isLoading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState([]);

  useEffect(() => {
    axios.get('/api/sales').then(res => setSalesData(res.data));
  }, []);

  useEffect(() => {
    if (!userReleases.length) setLoading(true);
    dispatch(fetchUserReleases()).then(() => setLoading(false));
  }, [dispatch, userReleases.length]);

  useEffect(() => {
    if (!userReleases.length) return;
    dispatch(fetchUserReleasesFavCounts());
    dispatch(fetchUserReleasesPlayCounts());
  }, [dispatch, userReleases.length]);

  const releasesOffline = () => {
    if (!userReleases) return;
    const offline = userReleases.filter(release => release.published === false);
    return offline.length;
  };

  const renderUserReleases = () =>
    userReleases.map(release => {
      const releaseId = release._id;
      const numSold = salesData.find(({ _id }) => _id === releaseId)?.sum;
      return (
        <UserRelease
          key={releaseId}
          numSold={numSold}
          release={release}
          favs={favCounts[releaseId]}
          plays={playCounts[releaseId]}
        />
      );
    });

  if (isLoading) {
    return (
      <Spinner>
        <h2>Loading releases&hellip;</h2>
      </Spinner>
    );
  }

  if (!userReleases.length) {
    return (
      <main className="container">
        <div className="row">
          <div className="col p-3">
            <h3 className="text-center mt-4">Add your first release</h3>
            <p className="text-center">
              You don&rsquo;t currently have any releases for sale. Please hit the button below to add your first
              release.
            </p>
            <div className="d-flex justify-content-center">
              <Link title="Add Release" role="button" to={'/release/add/'}>
                <Button className={styles.addRelease} icon={faPlusCircle} style={{ marginTop: '2rem' }}>
                  Add Release
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container-fluid">
      <div className="row">
        <div className="col py-3">
          <h3 className="text-center">
            You have {userReleases.length} release
            {userReleases.length > 1 ? 's' : ''} {releasesOffline() ? ` (${releasesOffline()} offline)` : null}
          </h3>
          <ul className={styles.releases}>{renderUserReleases()}</ul>
          <Link title="Add Release" role="button" to={'/release/add/'}>
            <Button className={styles.addRelease} icon={faPlusCircle}>
              Add Release
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

export default UserReleases;
